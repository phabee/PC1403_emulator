import type { IBusDevice } from './Bus';

export class Memory implements IBusDevice {
    private data: Uint8Array;
    private readonly size: number;
    private readonly readOnly: boolean;

    constructor(size: number, readOnly: boolean = false) {
        this.size = size;
        this.data = new Uint8Array(size);
        this.readOnly = readOnly;
    }

    public read(address: number): number {
        // Address received here is absolute system address? 
        // Or relative to the device?
        // Should be relative if mapped, but the Bus simply passes the system address.
        // The Bus should probably subtract the offset or the Memory should know its offset.
        // Let's assume the Bus passes the absolute address, but the Memory is mapped at an offset.
        // Actually, simple memory blocks usually don't know their offset. 
        // BUT the read(address) method usually takes an offset-ed address or the device handles masking.

        // Correction: In my Bus implementation, I pass the global address. 
        // I need to subtract the start address.
        // Refactor Bus to pass relative address? 
        // Or make Memory accept an offset in constructor?
        // Let's make Bus pass absolute, but we need handling.
        // For simplicity now, let's assume we map exact chunks or handle masking in the instance.
        // A better approach: The Memory object represents a physical chip.
        // The bus mapping handles the address translation.

        // Re-implementation of Bus logic needed?
        // Let's stick to: Memory takes size. Bus must pass `address - start` OR Memory ignores the upper bits?
        // Let's change Bus to pass relative address `address - entry.start`.
        // Wait, simpler: Memory just holds data. The size is small (e.g. 8KB). 
        // If I map 8KB at 0x2000, `read(0x2000)` should access index 0.

        // I will update Bus in next step or use this assumption.
        // For now, I'll rely on the Bus being updated to pass relative address.
        // ... Actually, I can't update Bus immediately in parallel. 
        // I'll implement Memory to expect relative execution (0-indexed).

        if (address < 0 || address >= this.size) return 0;
        return this.data[address];
    }

    public write(address: number, value: number): void {
        if (this.readOnly) return;
        if (address < 0 || address >= this.size) return;
        this.data[address] = value;
    }

    public load(data: Uint8Array | number[], offset: number = 0) {
        for (let i = 0; i < data.length; i++) {
            if (offset + i < this.size) {
                this.data[offset + i] = data[i];
            }
        }
    }

    public getRawData(): Uint8Array {
        return this.data;
    }
}
