export class Lcd {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private memory: Uint8Array; // Display memory? 
    // PC-1403 has specific display RAM or it's part of SC61860 LCD controller.
    // SC61860 has a built-in LCD controller.
    // Display RAM is usually internally mapped in the CPU or a specific memory range.
    // Docs say: "Display memory at 0x0000-0x00..?" No, usually internal RAM or dedicated registers.
    // Or mapped to External Memory?
    // Let's assume it receives commands or we map a buffer.

    // For MVP, lets just expose a method `drawPixel(x, y, state)` and `clear()`.

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');
        this.ctx = context;

        // Initialize placeholder display memory
        this.memory = new Uint8Array(1024);

        // Set up scaling?
        // PC-1403 is 1 line, 24 characters (5x7 dots)
        // 24 * 5 = 120 (plus spacing)
        // Actually 24 chars * 6 pixels (5+1 space) = 144 pixels wide?
        // Let's start with a buffer.
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
        // Draw a small rect
        const scale = 4;
        this.ctx.fillRect(x * scale, y * scale, scale - 1, scale - 1);
    }
}
