import { FONT_5X7 } from './Font5x7';

export class Lcd {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private memory: Uint8Array;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        this.ctx = context;

        // Initialize placeholder display memory
        this.memory = new Uint8Array(1024);
    }

    public getMemory() {
        return this.memory;
    }

    public clear() {
        this.ctx.fillStyle = '#9ea7a1'; // LCD background color
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public setPixel(x: number, y: number, on: boolean) {
        this.ctx.fillStyle = on ? '#000000' : '#889088'; // Active / Inactive pixel
        this.ctx.fillRect(x, y, 1, 1);
    }

    public print(text: string, pos: number = 0) {
        let cursorX = pos * 6;
        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            const pattern = FONT_5X7[char] || FONT_5X7[' '];

            // Draw 5 columns
            for (let col = 0; col < 5; col++) {
                const bits = pattern[col];
                for (let row = 0; row < 7; row++) {
                    // Pattern: LSB (bit 0) is top pixel
                    const on = (bits >> row) & 1;
                    this.setPixel(cursorX + col, row, !!on);
                }
            }
            // Clear 6th column (spacing)
            for (let row = 0; row < 7; row++) this.setPixel(cursorX + 5, row, false);

            cursorX += 6;
        }
    }
}
