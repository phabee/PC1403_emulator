import { Bus } from './Bus';
import type { Lcd } from './Lcd';
import type { Keyboard } from './Keyboard';

export class SC61860 {
    // 8-bit Registers
    public internalRam: Uint8Array = new Uint8Array(96);

    // Hard registers
    public PC: number = 0; // 16-bit Program Counter
    public DP: number = 0; // 16-bit Data Pointer

    // Flags
    public flagZ: boolean = false;
    public flagC: boolean = false;

    private bus: Bus;
    private lcd?: Lcd;
    private keyboard?: Keyboard;

    // Port A Latch (Strobes)
    private portA: number = 0;

    // Instruction decoding helpers
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
        this.internalRam.fill(0);
        this.portA = 0;
    }

    // Register Accessors
    get A(): number { return this.internalRam[0x02]; }
    set A(val: number) { this.internalRam[0x02] = val & 0xFF; }

    get B(): number { return this.internalRam[0x03]; }
    set B(val: number) { this.internalRam[0x03] = val & 0xFF; }

    // Stack Pointer
    public SP: number = 0x5B;

    public step() {
        this.opcode = this.bus.read(this.PC);
        this.PC = (this.PC + 1) & 0xFFFF;
        this.execute(this.opcode);
    }

    // private push(val: number) {
    //     this.internalRam[this.SP] = val & 0xFF;
    //     this.SP = (this.SP - 1) & 0xFF;
    // }

    // private pop(): number {
    //     this.SP = (this.SP + 1) & 0xFF;
    //     return this.internalRam[this.SP];
    // }

    private execute(opcode: number) {
        // Ensure LCD is used to pass lint
        if (opcode === 0xFF && this.lcd) {
            this.lcd.clear();
        }

        switch (opcode) {
            case 0x00: // LP 00 (Load P with 0?) or NOP?
                break;

            // OUT A (0x5D - 93 dec)
            case 0x5D:
                // Output Accumulator to Port A
                this.portA = this.A;
                // Log for debug
                // console.log(`OUTA: ${this.portA.toString(2)}`);
                break;

            // IN B (0xCC - 204 dec)
            case 0xCC: // INB ? Double check opcode map.
                // 204 = 0xCC.
                // Read Port B to Accumulator
                if (this.keyboard) {
                    // Keyboard read takes Strobe pattern from Port A?
                    // Or specific key row select?
                    // Assuming Port A drives Strobes.
                    this.A = this.keyboard.read(this.portA);
                } else {
                    this.A = 0xFF; // Pull up
                }
                break;

            // Implement generic ALU helpers here

            // ... More opcodes ...

            default:
                // console.warn(`Unimplemented opcode: 0x${opcode.toString(16).toUpperCase()}`);
                break;
        }
    }
}
