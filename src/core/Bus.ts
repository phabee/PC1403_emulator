export interface IBusDevice {
    read(address: number): number;
    write(address: number, value: number): void;
}

export class Bus {
    private devices: { start: number; end: number; device: IBusDevice }[] = [];

    constructor() { }

    public register(device: IBusDevice, start: number, end: number) {
        this.devices.push({ start, end, device });
        // Sort implementation details if overlaps matter, usually last registered wins or first?
        // For simplicity, we search in order.
    }

    public read(address: number): number {
        for (const entry of this.devices) {
            if (address >= entry.start && address <= entry.end) {
                return entry.device.read(address - entry.start);
            }
        }
        return 0x00; // Open bus?
    }

    public write(address: number, value: number): void {
        for (const entry of this.devices) {
            if (address >= entry.start && address <= entry.end) {
                entry.device.write(address - entry.start, value);
                return;
            }
        }
    }
}
