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
        // Internal ROM (0x0000 - 0x1FFF)
        this.internalRom = new Memory(0x2000, true);
        this.bus.register(this.internalRom, 0x0000, 0x1FFF);

        // External RAM (Example mapping, needs verification)
        // PC-1403 RAM: 8KB. Mapped at?
        // Often 0xC000 or similar? 
        // MAME source would tell. 
        // Let's assume 8KB at 0xC000 for now.
        this.externalRam = new Memory(0x2000);
        this.bus.register(this.externalRam, 0xC000, 0xDFFF);

        // Register Keyboard/LCD to Bus (if memory mapped) or just hold refs.
        // In SC61860, I/O is often via specific instructions (INA, OUTA, etc)
        // which might not go through the Main Bus 16-bit address space.
        // They go through the I/O bus or internal registers.
        // For now, CPU needs reference to Keyboard/LCD.

        // We can inject them into CPU:
        this.cpu.setDevices(this.lcd, this.keyboard);
    }

    public boot() {
        this.cpu.reset();
        this.start();
    }

    public start() {
        if (this.animationFrameId) return;
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
    }

    public loadRom(data: Uint8Array) {
        this.internalRom.load(data);
    }
}
