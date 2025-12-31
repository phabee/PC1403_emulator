import { Bus } from './Bus';
import { Memory } from './Memory';
import { SC61860 } from './SC61860';
import { Lcd } from './Lcd';
import { Keyboard } from './Keyboard';

export class Emulator {
    public bus: Bus;
    public cpu: SC61860;
    public internalRom: Memory;
    public externalRam: Memory;
    public lcd: Lcd;
    public keyboard: Keyboard;

    private animationFrameId: number | null = null;

    constructor(lcdCanvas: HTMLCanvasElement) {
        this.bus = new Bus();
        this.cpu = new SC61860(this.bus);
        this.lcd = new Lcd(lcdCanvas);
        this.keyboard = new Keyboard();

        // Initialize Memory
        // Internal ROM: Resize to 64KB to accommodate larger ROM files
        // We register external RAM *before* ROM so RAM takes precedence if ranges overlap
        // (assuming Bus checks in order).
        // Wait, Bus.ts checks in order of push. 
        // So we should push RAM/LCD first if we want them to overlay ROM.

        // External RAM (8KB normally)
        this.externalRam = new Memory(0x2000);
        this.bus.register(this.externalRam, 0xC000, 0xDFFF);

        // LCD (Mapping to likely IO area or verify)
        this.bus.register(this.lcd, 0x3000, 0x3018);

        // Internal ROM (Map to 0x0000 - 0xBFFF or full 64K)
        // If we map 0-FFFF, we catch everything else.
        this.internalRom = new Memory(0x10000, true); // 64KB
        this.bus.register(this.internalRom, 0x0000, 0xFFFF);

        // We can inject them into CPU:
        this.cpu.setDevices(this.lcd, this.keyboard);
    }

    public boot() {
        console.log('[Emulator] Booting...');
        this.lcd.clear(); // Ensure screen is clean on boot
        this.cpu.reset();
        this.start();
    }

    public start() {
        console.log('[Emulator] Starting main loop...');
        if (this.animationFrameId) {
            console.log('[Emulator] Loop already running, skipping start.');
            return;
        }
        const loop = () => {
            // Execute a number of cycles per frame
            for (let i = 0; i < 12000; i++) {
                this.cpu.step();
            }
            this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    }

    public stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.lcd.clear(); // Clear screen on stop/power off
    }

    public loadRom(data: Uint8Array) {
        console.log(`[Emulator] Loading ROM. Size: ${data.length} bytes`);
        // If data is small (32KB), and we access >32KB, we need to know.
        this.internalRom.load(data);
    }
}
