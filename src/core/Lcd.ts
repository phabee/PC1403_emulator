import { FONT_5X7 } from './Font5x7';
import type { IBusDevice } from './Bus';

export class Lcd implements IBusDevice {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private memory: Uint8Array;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        this.ctx = context;

        // Initialize display memory (24 chars)
        this.memory = new Uint8Array(24);
        this.memory.fill(32); // Start with Spaces
    }

    // Bus Device Implementation
    public read(addr: number): number {
        // Map 0x00 - 0x17 to the 24 chars
        if (addr >= 0 && addr < this.memory.length) {
            return this.memory[addr];
        }
        return 0;
    }

    public write(addr: number, val: number) {
        if (addr >= 0 && addr < this.memory.length) {
            this.memory[addr] = val;
            this.drawChar(addr, val);
        }
    }

    public clear() {
        this.ctx.fillStyle = '#9ea7a1'; // LCD background color
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.memory.fill(32); // Space
    }

    public setPixel(x: number, y: number, on: boolean) {
        this.ctx.fillStyle = on ? '#000000' : '#889088'; // Active / Inactive pixel
        this.ctx.fillRect(x, y, 1, 1);
    }

    private drawChar(pos: number, charCode: number) {
        const char = String.fromCharCode(charCode).toUpperCase();

        let pattern = FONT_5X7[char];

        const xStart = pos * 6;
        this.ctx.fillStyle = '#9ea7a1';
        this.ctx.fillRect(xStart, 0, 6, 8); // Clear

        if (!pattern) {
            // Unknown char: Draw a box to make it visible
            if (charCode === 32) { // True Space
                pattern = FONT_5X7[' '];
            } else {
                // Garbage / Unknown Symbol -> Checkerboard / Box
                this.ctx.fillStyle = '#000000';
                this.ctx.strokeRect(xStart + 0.5, 0.5, 4, 6);
                return;
            }
        }

        if (pattern) {
            for (let col = 0; col < 5; col++) {
                const bits = pattern[col];
                for (let row = 0; row < 7; row++) {
                    const on = (bits >> row) & 1;
                    this.setPixel(xStart + col, row, !!on);
                }
            }
        }
    }

    public print(text: string, pos: number = 0) {
        for (let i = 0; i < text.length; i++) {
            if (pos + i >= this.memory.length) break;
            const code = text.charCodeAt(i);
            this.write(pos + i, code);
        }
    }
}
