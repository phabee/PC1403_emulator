import { Bus } from './Bus';
import type { Lcd } from './Lcd';
import type { Keyboard } from './Keyboard';

export class SC61860 {
    // 8-bit Registers. Mapped to Internal RAM.
    // 8-bit Registers. Mapped to Internal RAM.
    // 00-5F: User RAM / Stack?
    // 60-77: LCD RAM (Display Buffer for 24 chars)?
    public internalRam: Uint8Array = new Uint8Array(256);

    // Hard registers
    public PC: number = 0; // 16-bit Program Counter
    public DP: number = 0; // 16-bit Data Pointer
    public P: number = 0; // 8-bit P register. Destination Pointer.
    public Q: number = 0; // 8-bit Q register.
    public R: number = 0; // 8-bit Stack Pointer (R)
    public flagZ: boolean = false;
    public flagC: boolean = false;

    // Internal H register (hidden, mostly logic side effect)
    public H: number = 0;

    private bus: Bus;
    public lcd?: Lcd;
    private keyboard?: Keyboard;

    // Port A Latch
    private portA: number = 0;

    private opcode: number = 0;

    constructor(bus: Bus) {
        this.bus = bus;
        this.reset();
    }

    public setDevices(lcd: Lcd, keyboard: Keyboard) {
        this.lcd = lcd;
        this.keyboard = keyboard;
    }

    public reset() {
        this.PC = 0x0000;
        this.DP = 0x0000;
        this.P = 0;
        this.Q = 0;
        this.R = 0x5B;
        this.debugCount = 0; // RE-ENABLE TRACE ON RESET

        this.internalRam.fill(0);
        this.portA = 0;
        this.flagZ = false;
        this.flagC = false;
    }

    // Register Accessors
    get I(): number { return this.internalRam[0x00]; }
    set I(val: number) { this.internalRam[0x00] = val & 0xFF; }
    get J(): number { return this.internalRam[0x01]; }
    set J(val: number) { this.internalRam[0x01] = val & 0xFF; }
    get A(): number { return this.internalRam[0x02]; }
    set A(val: number) { this.internalRam[0x02] = val & 0xFF; }
    get B(): number { return this.internalRam[0x03]; }
    set B(val: number) { this.internalRam[0x03] = val & 0xFF; }
    get X(): number { return ((this.internalRam[0x05] << 8) | this.internalRam[0x04]) & 0xFFFF; }
    set X(val: number) { this.internalRam[0x04] = val & 0xFF; this.internalRam[0x05] = (val >> 8) & 0xFF; }
    get Y(): number { return ((this.internalRam[0x07] << 8) | this.internalRam[0x06]) & 0xFFFF; }
    set Y(val: number) { this.internalRam[0x06] = val & 0xFF; this.internalRam[0x07] = (val >> 8) & 0xFF; }
    get K(): number { return this.internalRam[0x08]; }
    set K(val: number) { this.internalRam[0x08] = val & 0xFF; }
    get L(): number { return this.internalRam[0x09]; }
    set L(val: number) { this.internalRam[0x09] = val & 0xFF; }
    get M(): number { return this.internalRam[0x0A]; }
    set M(val: number) { this.internalRam[0x0A] = val & 0xFF; }
    get N(): number { return this.internalRam[0x0B]; }
    set N(val: number) { this.internalRam[0x0B] = val & 0xFF; }

    // Helpers
    private setZ(val: number) { this.flagZ = (val === 0); }
    private setC(val: number) { this.flagC = (val > 255); }
    private setBorrow(val: number) { this.flagC = (val < 0); }

    private push(val: number) {
        if (this.R < this.internalRam.length) this.internalRam[this.R] = val & 0xFF;
        this.R = (this.R - 1) & 0xFF;
    }
    private pop(): number {
        this.R = (this.R + 1) & 0xFF;
        return (this.R < this.internalRam.length) ? this.internalRam[this.R] : 0;
    }

    private readPC(): number {
        const val = this.bus.read(this.PC);
        this.PC = (this.PC + 1) & 0xFFFF;
        return val;
    }

    private readRam(addr: number): number {
        return (addr < this.internalRam.length) ? this.internalRam[addr] : 0; // Should be memory mapped? For P/Q ops, usually internal.
    }

    private writeRam(addr: number, val: number) {
        if (addr < this.internalRam.length) this.internalRam[addr] = val & 0xFF;

        // Hook for LCD
        if (addr >= 0x60 && addr < 0x78 && this.lcd) {
            console.log(`[LCD Hook] Write Addr: 0x${addr.toString(16)} (Pos ${addr - 0x60}) Val: 0x${val.toString(16)} ('${String.fromCharCode(val)}')`);
            this.lcd.write(addr - 0x60, val);
        }
    }

    private readMem(addr: number): number {
        if (addr < 0x60) {
            return this.internalRam[addr];
        } else if (addr >= 0x60 && addr < 0x78) {
            return this.internalRam[addr]; // LCD RAM read
        }
        return this.bus.read(addr);
    }

    private writeMem(addr: number, val: number) {
        if (addr < 0x60) {
            this.internalRam[addr] = val & 0xFF;
        } else if (addr >= 0x60 && addr < 0x78) {
            this.internalRam[addr] = val & 0xFF;
            if (this.lcd) this.lcd.write(addr - 0x60, val);
        } else if (addr === 0x3A00) {
            // Port C Output (Ext1-4 etc, and Key Row Strobe?)
            // Just silence the warning for now or implement port hook
            // console.log(`[Port C] Write 0x${val.toString(16)}`);
        } else {
            this.bus.write(addr, val);
        }
    }

    private debugCount: number = 0;

    private bcdAdd(v1: number, v2: number, carryIn: boolean): { res: number, carry: boolean } {
        let lower = (v1 & 0x0F) + (v2 & 0x0F) + (carryIn ? 1 : 0);
        let halfCarry = 0;
        if (lower > 9) {
            lower -= 10;
            halfCarry = 1;
        }
        let upper = (v1 >> 4) + (v2 >> 4) + halfCarry;
        let carry = false;
        if (upper > 9) {
            upper -= 10;
            carry = true;
        }
        const res = (upper << 4) | lower;
        return { res: res & 0xFF, carry };
    }

    private bcdSub(v1: number, v2: number, borrowIn: boolean): { res: number, borrow: boolean } {
        let lower = (v1 & 0x0F) - (v2 & 0x0F) - (borrowIn ? 1 : 0);
        let halfBorrow = 0;
        if (lower < 0) {
            lower += 10;
            halfBorrow = 1;
        }
        let upper = (v1 >> 4) - (v2 >> 4) - halfBorrow;
        let borrow = false;
        if (upper < 0) {
            upper += 10;
            borrow = true;
        }
        const res = (upper << 4) | lower;
        return { res: res & 0xFF, borrow };
    }

    public step() {
        // Trace first 1000 steps after reset
        if (this.debugCount < 1000) {
            const op = this.bus.read(this.PC);
            console.log(`[CPU] PC:${this.PC.toString(16).padStart(4, '0')} Op:${op.toString(16).padStart(2, '0').toUpperCase()} P:${this.P.toString(16)} Q:${this.Q.toString(16)} A:${this.A.toString(16)} DP:${this.DP.toString(16)}`);
            this.debugCount++;
        }
        this.opcode = this.readPC();
        this.execute(this.opcode);
    }

    private execute(opcode: number) {
        // Broad Categories
        if ((opcode & 0xC0) === 0x80) { // LP n (0x80 - 0xBF)
            this.P = opcode & 0x3F;
            this.H = (0x80 + this.P) & 0xFF;
            return;
        }

        if ((opcode & 0xF0) === 0xF0 && opcode !== 0xFE) { // CAL 111 hhhhh (0xF0-0xFF)
            const high = opcode & 0x1F;
            const low = this.readPC();
            const target = (high << 8) | low;
            this.push((this.PC >> 8) & 0xFF);
            this.push(this.PC & 0xFF);
            this.PC = target;
            return;
        }

        switch (opcode) {
            case 0x00: { const n = this.readPC(); this.I = n; break; } // LII
            case 0x01: { const n = this.readPC(); this.J = n; break; } // LIJ
            case 0x02: { const n = this.readPC(); this.A = n; this.setZ(this.A); break; } // LIA
            case 0x03: { const n = this.readPC(); this.B = n; this.setZ(this.B); break; } // LIB
            case 0x04: { this.X = (this.X + 1) & 0xFFFF; this.DP = this.X; this.Q = 5; this.H = (this.X >> 8) & 0xFF; break; } // IX
            case 0x05: { this.X = (this.X - 1) & 0xFFFF; this.DP = this.X; this.Q = 5; this.H = this.X & 0xFF; break; } // DX (H=Xl for DX)
            case 0x06: { this.Y = (this.Y + 1) & 0xFFFF; this.DP = this.Y; this.Q = 7; this.H = (this.Y >> 8) & 0xFF; break; } // IY
            case 0x07: { this.Y = (this.Y - 1) & 0xFFFF; this.DP = this.Y; this.Q = 7; this.H = this.Y & 0xFF; break; } // DY
            case 0x08: { // MVW
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    this.writeRam(this.P, this.readRam(this.Q));
                    this.P = (this.P + 1) & 0xFF; this.Q = (this.Q + 1) & 0xFF;
                }
                break;
            }
            case 0x09: { // EXW
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    const temp = this.readRam(this.P);
                    this.writeRam(this.P, this.readRam(this.Q));
                    this.writeRam(this.Q, temp);
                    this.P = (this.P + 1) & 0xFF; this.Q = (this.Q + 1) & 0xFF;
                }
                break;
            }
            case 0x0A: { // MVB
                const count = this.J + 1;
                for (let k = 0; k < count; k++) {
                    this.writeRam(this.P, this.readRam(this.Q));
                    this.P = (this.P + 1) & 0xFF; this.Q = (this.Q + 1) & 0xFF;
                }
                break;
            }
            case 0x0B: { // EXB
                const count = this.J + 1;
                for (let k = 0; k < count; k++) {
                    const temp = this.readRam(this.P);
                    this.writeRam(this.P, this.readRam(this.Q));
                    this.writeRam(this.Q, temp);
                    this.P = (this.P + 1) & 0xFF; this.Q = (this.Q + 1) & 0xFF;
                }
                break;
            }
            // 0x0C ADN (BCD) - Partial Imp
            case 0x0C: { // ADN (BCD)
                const { res, carry } = this.bcdAdd(this.readRam(this.P), this.A, false); // ADN does not use C flag input? Docs say "No".
                // Actually ADN: (P)+A -> P. BCD.
                this.writeRam(this.P, res);
                this.setC(carry ? 256 : 0);
                this.setZ(res);
                break;
            }
            case 0x0D: { // SBN (BCD)
                const { res, borrow } = this.bcdSub(this.readRam(this.P), this.A, false);
                this.writeRam(this.P, res);
                this.setBorrow(borrow ? -1 : 0);
                this.setZ(res);
                break;
            }
            case 0x0E: { // ADW (BCD)
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    const p = this.P; const q = this.Q;
                    const { res, carry } = this.bcdAdd(this.readRam(p), this.readRam(q), this.flagC);
                    this.writeRam(p, res);
                    this.flagC = carry; // Direct flag set
                    this.P = (this.P + 1) & 0xFF; this.Q = (this.Q + 1) & 0xFF;
                }
                break;
            }
            case 0x0F: { // SBW (BCD)
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    const p = this.P; const q = this.Q;
                    const { res, borrow } = this.bcdSub(this.readRam(p), this.readRam(q), this.flagC);
                    this.writeRam(p, res);
                    this.flagC = borrow; // Borrow uses flagC
                    this.P = (this.P + 1) & 0xFF; this.Q = (this.Q + 1) & 0xFF;
                }
                break;
            }

            case 0x10: {
                const l = this.readPC(); const h = this.readPC();
                this.DP = (h << 8) | l; this.H = h;
                console.log(`[CPU] LIDP 0x${this.DP.toString(16).padStart(4, '0')}`);
                break;
            } // LIDP
            case 0x11: { const m = this.readPC(); this.DP = (this.DP & 0xFF00) | m; this.H = m; break; } // LIDL
            case 0x12: { const n = this.readPC(); this.P = n; this.H = 0; break; } // LIP
            case 0x13: { const n = this.readPC(); this.Q = n; this.H = n; break; } // LIQ
            case 0x14: { // ADB
                const p = this.P;
                const { res, carry } = this.bcdAdd(this.readRam(p), this.A, false);
                this.writeRam(p, res);
                // ADB is typically 1 byte? Or multi? 
                // "Add BCD A to (P), result to (P). Then Add B to (P+1) with carry."
                // Yes, chained.
                // Low byte
                const p1 = (p + 1) & 0xFF;
                const { res: res2, carry: carry2 } = this.bcdAdd(this.readRam(p1), this.B, carry);
                this.writeRam(p1, res2);
                this.flagC = carry2;
                this.P = (this.P + 1) & 0xFF; // Only P increments? Or P stays? Docs say P incs.
                break;
            }
            case 0x15: { // SBB
                const p = this.P;
                const { res, borrow } = this.bcdSub(this.readRam(p), this.A, false);
                this.writeRam(p, res);
                const p1 = (p + 1) & 0xFF;
                const { res: res2, borrow: borrow2 } = this.bcdSub(this.readRam(p1), this.B, borrow);
                this.writeRam(p1, res2);
                this.flagC = borrow2;
                this.P = (this.P + 1) & 0xFF;
                break;
            }
            case 0x16: { const off = this.readPC(); const sOff = (off & 0x80) ? (off - 0x100) : off; this.PC = (this.PC + sOff) & 0xFFFF; break; } // JR
            case 0x18: { // MVWD
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    this.writeRam(this.P, this.readMem(this.DP));
                    this.P = (this.P + 1) & 0xFF; this.DP = (this.DP + 1) & 0xFFFF;
                }
                break;
            }
            case 0x19: { // EXWD
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    const temp = this.readRam(this.P);
                    this.writeRam(this.P, this.readMem(this.DP));
                    this.writeMem(this.DP, temp);
                    this.P = (this.P + 1) & 0xFF; this.DP = (this.DP + 1) & 0xFFFF;
                }
                break;
            }
            case 0x1A: { // MVBD
                const count = this.J + 1;
                for (let k = 0; k < count; k++) {
                    this.writeRam(this.P, this.readMem(this.DP));
                    this.P = (this.P + 1) & 0xFF; this.DP = (this.DP + 1) & 0xFFFF;
                }
                break;
            }
            case 0x1B: { // EXBD
                const count = this.J + 1;
                for (let k = 0; k < count; k++) {
                    const temp = this.readRam(this.P);
                    this.writeRam(this.P, this.readMem(this.DP));
                    this.writeMem(this.DP, temp);
                    this.P = (this.P + 1) & 0xFF; this.DP = (this.DP + 1) & 0xFFFF;
                }
                break;
            }
            case 0x1C: { // SRW
                const count = this.I + 1;
                this.P = (this.P + count) & 0xFF; // Placeholder for Shift Logic
                break;
            }
            // 0x1D SLW
            case 0x1E: { // FILM
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    this.writeRam(this.P, this.A);
                    this.P = (this.P + 1) & 0xFF;
                }
                this.H = this.A;
                break;
            }
            case 0x1F: { // FILD
                const count = this.I + 1;
                for (let k = 0; k < count; k++) {
                    this.writeMem(this.DP, this.A);
                    this.DP = (this.DP + 1) & 0xFFFF;
                }
                break;
            }
            case 0x20: { this.A = this.P; this.setZ(this.A); break; } // LDP
            case 0x21: { this.A = this.Q; this.setZ(this.A); break; } // LDQ
            case 0x22: { this.A = this.R; this.setZ(this.A); break; } // LDR
            case 0x23: { this.A = 0; this.H = 0; break; } // CLRA
            case 0x24: { // IXL
                this.X = (this.X + 1) & 0xFFFF; this.DP = this.X; this.A = this.readMem(this.DP); this.Q = 5;
                break;
            }
            case 0x25: { // DXL
                this.X = (this.X - 1) & 0xFFFF; this.DP = this.X; this.A = this.bus.read(this.DP); this.Q = 5; this.H = this.X & 0xFF;
                break;
            }
            case 0x26: { // IYS
                this.Y = (this.Y + 1) & 0xFFFF; this.DP = this.Y; this.bus.write(this.DP, this.A); this.Q = 7;
                break;
            }
            case 0x27: { // DYS
                this.Y = (this.Y - 1) & 0xFFFF; this.DP = this.Y; this.bus.write(this.DP, this.A); this.Q = 7; this.H = this.Y & 0xFF;
                break;
            }

            // JUMPS
            case 0x28: { // JRNZP
                const n = this.readPC(); if (!this.flagZ) { this.PC = (this.PC + n) & 0xFFFF; }
                break;
            }
            case 0x29: { // JRNZM
                const n = this.readPC(); if (!this.flagZ) { this.PC = (this.PC - n) & 0xFFFF; }
                break;
            }
            case 0x2A: { // JRNCP
                const n = this.readPC(); if (!this.flagC) { this.PC = (this.PC + n) & 0xFFFF; }
                break;
            }
            case 0x2B: { // JRNCM
                const n = this.readPC(); if (!this.flagC) { this.PC = (this.PC - n) & 0xFFFF; }
                break;
            }
            case 0x2C: { // JRP
                const n = this.readPC(); this.PC = (this.PC + n) & 0xFFFF;
                break;
            }
            case 0x2D: { // JRM
                const n = this.readPC(); this.PC = (this.PC - n) & 0xFFFF;
                break;
            }
            case 0x2F: { // LOOP
                const n = this.readPC();
                this.writeRam(this.R, (this.readRam(this.R) - 1) & 0xFF);
                // Note: LOOP uses dec(R), if R!=0? 
                // Docs: (R)-1 -> R, IF c=0? No, usually check counter.
                const val = this.readRam(this.R);
                if (val !== 0xFF) { // Loop until wraps to FF? Or 0?
                    // Verify LOOP implementation: "DEC (R), if not 0 jump"
                    // Docs say "IF c=0"? "R-1->R".
                    // Let's assume typical Decrement & Jump if Not Zero.
                    if (val !== 0) {
                        this.PC = (this.PC - n) & 0xFFFF; // Usually Back
                    }
                }
                break;
            }
            case 0x30: { this.P = this.A; this.H = this.A; break; } // STP
            case 0x31: { this.Q = this.A; this.H = this.A; break; } // STQ
            case 0x32: { this.R = this.A; this.H = this.A; break; } // STR
            case 0x33: { this.H = this.A; break; } // STH
            case 0x34: { this.push(this.A); break; } // PUSH

            case 0x37: { const l = this.pop(); const h = this.pop(); this.PC = (h << 8) | l; break; } // RTN
            case 0x38: { const n = this.readPC(); if (this.flagZ) this.PC = (this.PC + n) & 0xFFFF; break; } // JRZP
            case 0x39: { const n = this.readPC(); if (this.flagZ) this.PC = (this.PC - n) & 0xFFFF; break; } // JRZM
            case 0x3A: { const n = this.readPC(); if (this.flagC) this.PC = (this.PC + n) & 0xFFFF; break; } // JRCP
            case 0x3B: { const n = this.readPC(); if (this.flagC) this.PC = (this.PC - n) & 0xFFFF; break; } // JRCM

            case 0x40: { let v = this.I + 1; this.I = v & 0xFF; this.Q = 0; this.setZ(this.I); this.setC(v); break; } // INCI
            case 0x41: { let v = this.I - 1; this.I = v & 0xFF; this.Q = 0; this.setZ(this.I); this.setBorrow(v); break; } // DECI
            case 0x42: { let v = this.A + 1; this.A = v & 0xFF; this.Q = 2; this.setZ(this.A); this.setC(v); break; } // INCA
            case 0x43: { let v = this.A - 1; this.A = v & 0xFF; this.Q = 2; this.setZ(this.A); this.setBorrow(v); break; } // DECA
            case 0x44: { // ADM
                const p = this.P;
                let val = this.readRam(p) + this.A;
                this.writeRam(p, val);
                this.setZ(val & 0xFF); this.setC(val);
                break;
            }
            case 0x45: { // SBM
                const p = this.P;
                let val = this.readRam(p) - this.A;
                this.writeRam(p, val);
                this.setZ(val & 0xFF); this.setBorrow(val);
                break;
            }
            case 0x46: { // ANMA
                const p = this.P;
                let val = this.readRam(p) & this.A;
                this.writeRam(p, val);
                this.setZ(val);
                break;
            }
            case 0x47: { // ORMA
                const p = this.P;
                let val = this.readRam(p) | this.A;
                this.writeRam(p, val);
                this.setZ(val);
                break;
            }
            case 0x48: { let v = this.K + 1; this.K = v & 0xFF; this.Q = 8; this.setZ(this.K); this.setC(v); break; } // INCK
            case 0x49: { let v = this.K - 1; this.K = v & 0xFF; this.Q = 8; this.setZ(this.K); this.setBorrow(v); break; } // DECK
            case 0x4A: { let v = this.M + 1; this.M = v & 0xFF; this.Q = 10; this.setZ(this.M); this.setC(v); break; } // INCM
            case 0x4B: { let v = this.M - 1; this.M = v & 0xFF; this.Q = 10; this.setZ(this.M); this.setBorrow(v); break; } // DECM
            case 0x4C: { if (this.keyboard) this.A = this.keyboard.read(this.portA); else this.A = 0; this.setZ(this.A); break; } // INA
            case 0x4D: { break; } // NOPW
            case 0x4E: { this.readPC(); break; } // WAIT n
            case 0x4F: { // CUP
                // I -> d. Loop logic. n/a?
                this.I = 0xFF; // Break loop immediately for now.
                break;
            }
            case 0x50: { this.P = (this.P + 1) & 0xFF; break; } // INCP
            case 0x51: { this.P = (this.P - 1) & 0xFF; break; } // DECP
            case 0x52: { this.writeMem(this.DP, this.A); break; } // STD
            case 0x53: { this.writeMem(this.DP, this.readRam(this.P)); break; } // MVDM
            case 0x54: { this.writeRam(this.P, this.readMem(this.PC)); this.PC = (this.PC + 1) & 0xFFFF; break; } // MVMP (read PC) - Wait, MVMP is Move Memory P? Source is Memory at PC? Usually "MVMP: (PC)->(P)"
            case 0x55: { this.writeRam(this.P, this.readMem(this.DP)); break; } // MVMD
            case 0x56: { this.A = this.readMem(this.PC); this.PC = (this.PC + 1) & 0xFFFF; break; } // LDPC ? LD from PC address ? usually LDI?
            case 0x57: { this.A = this.readMem(this.DP); this.setZ(this.A); break; } // LDD
            case 0x58: { this.A = ((this.A << 4) | (this.A >> 4)) & 0xFF; break; } // SWP
            case 0x59: { this.A = this.readRam(this.P); this.setZ(this.A); break; } // LDM
            case 0x5A: { // SL
                const c = this.flagC ? 1 : 0;
                this.flagC = !!(this.A & 0x80);
                this.A = ((this.A << 1) | c) & 0xFF;
                break;
            }
            case 0x5B: { this.A = this.pop(); break; } // POP
            case 0x5D: { this.portA = this.A; break; } // OUTA (and 5C->Q)

            case 0x60: { const n = this.readPC(); const p = this.P; const v = this.readRam(p) & n; this.writeRam(p, v); this.setZ(v); break; } // ANIM
            case 0x61: { const n = this.readPC(); const p = this.P; const v = this.readRam(p) | n; this.writeRam(p, v); this.setZ(v); break; } // ORIM
            case 0x62: { const n = this.readPC(); const p = this.P; const v = this.readRam(p) & n; this.setZ(v); break; } // TSIM (~Test P & n)
            case 0x63: { const n = this.readPC(); const v = this.readRam(this.P) - n; this.setZ(v & 0xFF); this.setBorrow(v); break; } // CPIM
            case 0x64: { const n = this.readPC(); this.A &= n; this.setZ(this.A); break; } // ANIA
            case 0x65: { const n = this.readPC(); this.A |= n; this.setZ(this.A); break; } // ORIA
            case 0x66: { const n = this.readPC(); this.setZ(this.A & n); break; } // TSIA
            case 0x67: { const n = this.readPC(); const v = this.A - n; this.setZ(v & 0xFF); this.setBorrow(v); break; } // CPIA

            case 0x69: { // DTC
                const n = this.readPC(); const l = this.readPC();
                // FOR i=1 TO d logic?
                // Just Loop n times? or Search?
                // For direct table call... n, nm.
                if (n === 0 && l === 0) { }
                break;
            }

            case 0x6B: { const n = this.readPC(); this.setZ((this.readRam(this.P)) & n); break; } // TEST n (on [P]?) Docs: "Test-byte&n"
            // Usually [P].

            case 0x70: { const n = this.readPC(); const p = this.P; let v = this.readRam(p) + n; this.writeRam(p, v); this.setZ(v & 0xFF); this.setC(v); break; } // ADIM
            case 0x71: { const n = this.readPC(); const p = this.P; let v = this.readRam(p) - n; this.writeRam(p, v); this.setZ(v & 0xFF); this.setBorrow(v); break; } // SBIM
            case 0x72: { const n = this.readPC(); const t = this.H; this.H = n; this.I = t; break; } // LIIH
            case 0x74: { const n = this.readPC(); let v = this.A + n; this.A = v & 0xFF; this.setZ(this.A); this.setC(v); break; } // ADIA
            case 0x75: { const n = this.readPC(); let v = this.A - n; this.A = v & 0xFF; this.setZ(this.A); this.setBorrow(v); break; } // SBIA

            case 0x78: { // CALL nm (3 bytes)
                const l = this.readPC(); const h = this.readPC();
                this.push((this.PC >> 8) & 0xFF); this.push(this.PC & 0xFF);
                this.PC = (h << 8) | l;
                break;
            }
            case 0x79: { // JP nm
                const l = this.readPC(); const h = this.readPC();
                this.PC = (h << 8) | l;
                break;
            }
            case 0x7C: { // JPNZ
                const l = this.readPC(); const h = this.readPC();
                if (!this.flagZ) this.PC = (h << 8) | l;
                break;
            }
            case 0x7D: { // JPNC
                const l = this.readPC(); const h = this.readPC();
                if (!this.flagC) this.PC = (h << 8) | l;
                break;
            }
            case 0x7E: { // JPZ
                const l = this.readPC(); const h = this.readPC();
                if (this.flagZ) this.PC = (h << 8) | l;
                break;
            }
            case 0x7F: { // JPC
                const l = this.readPC(); const h = this.readPC();
                if (this.flagC) this.PC = (h << 8) | l;
                break;
            }

            case 0xC0: { let v = this.J + 1; this.J = v & 0xFF; this.Q = 1; this.setZ(this.J); this.setC(v); break; } // INCJ
            case 0xC1: { let v = this.J - 1; this.J = v & 0xFF; this.Q = 1; this.setZ(this.J); this.setBorrow(v); break; } // DECJ
            case 0xC2: { let v = this.B + 1; this.B = v & 0xFF; this.Q = 3; this.setZ(this.B); this.setC(v); break; } // INCB
            case 0xC3: { let v = this.B - 1; this.B = v & 0xFF; this.Q = 3; this.setZ(this.B); this.setBorrow(v); break; } // DECB
            case 0xC4: { // ADCM
                const p = this.P;
                let val = this.readRam(p) + this.A + (this.flagC ? 1 : 0);
                this.writeRam(p, val);
                this.setZ(val & 0xFF); this.setC(val);
                break;
            }
            case 0xC5: { // SBCM
                const p = this.P;
                let val = this.readRam(p) - this.A - (this.flagC ? 1 : 0);
                this.writeRam(p, val);
                this.setZ(val & 0xFF); this.setBorrow(val);
                break;
            }
            // C6 TSMA
            case 0xC6: { this.setZ(this.readRam(this.P) & this.A); break; }
            // C7 CPMA
            case 0xC7: { const v = this.readRam(this.P) - this.A; this.setZ(v & 0xFF); this.setBorrow(v); break; }
            case 0xC8: { let v = this.L + 1; this.L = v & 0xFF; this.Q = 9; this.setZ(this.L); this.setC(v); break; } // INCL
            case 0xC9: { let v = this.L - 1; this.L = v & 0xFF; this.Q = 9; this.setZ(this.L); this.setBorrow(v); break; } // DECL
            case 0xCA: { let v = this.N + 1; this.N = v & 0xFF; this.Q = 11; this.setZ(this.N); this.setC(v); break; } // INCN
            case 0xCB: { let v = this.N - 1; this.N = v & 0xFF; this.Q = 11; this.setZ(this.N); this.setBorrow(v); break; } // DECN
            case 0xCC: { // INB
                if (this.keyboard) this.A = this.keyboard.read(this.portA); else this.A = 0xFF;
                break;
            }
            case 0xCD: { break; } // NOPW
            case 0xCE: { break; } // NOPT

            case 0xD0: { this.flagC = true; this.flagZ = true; break; } // SC
            case 0xD1: { this.flagC = false; this.flagZ = true; break; } // RC
            case 0xD2: { // SR
                const c = this.flagC ? 0x80 : 0;
                this.flagC = !!(this.A & 1);
                this.A = ((this.A >> 1) | c) & 0xFF;
                break;
            }
            case 0xD3: { break; }
            case 0xD4: { // ANID
                const n = this.readPC();
                this.writeMem(this.DP, this.readMem(this.DP) & n);
                break;
            }
            case 0xD5: { // ORID
                const n = this.readPC();
                this.writeMem(this.DP, this.readMem(this.DP) | n);
                break;
            }
            case 0xD6: { // TSID
                const n = this.readPC();
                this.setZ(this.readMem(this.DP) & n);
                break;
            }
            case 0xD7: { // CPID
                const n = this.readPC();
                const v = this.readMem(this.DP) - n;
                this.setZ(v & 0xFF); this.setBorrow(v);
                break;
            }
            case 0xD8: { // LEAVE
                this.writeRam(this.R, 0); // 0->(R)
                break;
            }
            case 0xDA: { // EXAB
                const temp = this.A; this.A = this.B; this.B = temp; break;
            }
            case 0xDB: { // EXAM
                const p = this.P; const temp = this.A; this.A = this.readRam(p); this.writeRam(p, temp); break;
            }
            case 0xDD: { // OUTB
                // 5D->Q ... logic?
                break;
            }
            case 0xDF: { break; } // OUTC

            case 0xE0: { // CAL E0
                // n=0.
                // Short call with n?
                // "E0+n". E0 is range start.
                // This was handled by range check above?
                // "if ((opcode & 0xF0) === 0xF0) ..."
                // 0xE0 is NOT 0xF0 range.
                // Ah, CAL is E0+n?
                // Table: CAL nm | E0+n XX.
                // So 0xE0 to 0xEF are CALs?
                // Wait, table says "E0+n".
                // Previous 0xF0-0xFF were manual guess.
                // Document says CAL nm is E0+n XX.
                // So 0xE0 .. 0xEF are valid CALs?
                // And 0xF0 .. 0xFF?
                // Wait, table for CAL says E0+n instructions.
                // What about 0xF0?
                // It doesn't list 0xF0 opcodes separately except maybe others?
                // Let's implement E0-EF as CAL.
                // And check if F0 is used.
                // Actually E0-EF: "PC+2 -> Stack".
                const high = opcode & 0x0F; // 0..15?
                const low = this.readPC();
                const target = (high << 8) | low;
                this.push((this.PC >> 8) & 0xFF);
                this.push(this.PC & 0xFF);
                this.PC = target;
                break;
            }

            case 0xFE: { // Manual CALL override if passed through
                // Should be matched by F0 range if F0 is Call?
                // But Table says CALL nm is 3 bytes (78 XX XX).
                // What about FE?
                // Table doesn't show FE?
                // "Unknown opcodes" section?
                // My CSV said FE is CAL30.
                // Previous F0-FF logic might be "Calculated Call" or "Special Call"?
                // Let's keep FE logic if we saw it in CSV.
                const l = this.readPC(); const h = this.readPC();
                this.push((this.PC >> 8) & 0xFF); this.push(this.PC & 0xFF);
                this.PC = (h << 8) | l;
                break;
            }

            case 0x5E: { break; } // Unknown / OUT?
            case 0x5F: { break; } // Unknown / OUT?

            case 0x98: { // EX P,Q (Undoc) - Sometimes happens?
                // Just break to silence if caught
                break;
            }

            default:
                // E0-EF handled in case? No, switch range is efficient.
                if ((opcode & 0xF0) === 0xE0) { // CAL range E0-EF
                    const high = opcode & 0x0F;
                    const low = this.readPC();
                    const target = (high << 8) | low;
                    this.push((this.PC >> 8) & 0xFF);
                    this.push(this.PC & 0xFF);
                    this.PC = target;
                    break;
                }
                console.error(`Unimplemented opcode: 0x${opcode.toString(16).toUpperCase()} at PC:0x${(this.PC - 1).toString(16)}`);
                break;
        }
    }
}
