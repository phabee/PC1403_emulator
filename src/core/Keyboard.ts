import { KEY_MAP } from './KeyMap';

export class Keyboard {
    private matrix: boolean[][] = [];

    constructor() {
        for (let i = 0; i < 16; i++) {
            this.matrix[i] = new Array(8).fill(false);
        }
    }

    public setKey(keyName: string, pressed: boolean) {
        const map = KEY_MAP[keyName];
        if (map) {
            this.matrix[map.strobe][map.bit] = pressed;
        }
    }

    public read(strobePattern: number): number {
        let result = 0xFF; // Active Low Inputs (0 = Pressed) usually

        // Check all 11 strobes
        for (let i = 0; i < 12; i++) {
            // If strobe i is active.
            // SC61860 Output Port C usually drives strobes via a decoder or direct?
            // Or Port A?
            // If Port A is used as strobe mask (8 bits), then we can only drive 8 strobes?
            // PC-1403 has more than 8 strobes (KEY9, EXTRA, MODE).
            // Thus it likely uses a Demultiplexer (e.g. 4 bits -> 16 lines) or multiple ports.

            // Assumption: The 'strobePattern' passed here is strictly the Strobe Index?
            // Or is it the Port Value?
            // If CPU writes to Port A (0-255), and that connects to a decoder?
            // Let's assume the CPU class handles the decoding and passes the Strobe Index here?
            // Or we pass the raw port value and Keyboard decodes?

            // Allow 'strobePattern' to be a mask if we assume direct drive, 
            // but if it uses a decoder (e.g. write 0 produces Strobe 0, write 1 produces Strobe 1),
            // then we check `if (strobePattern == i)`.

            // Let's implement active-low bitmask logic for now (common in simple matrices)
            // AND a specific check for if the OS writes an index.

            // For now: Assume strobePattern is a BITMASK of active LOW strobes.
            // i.e. if bit 0 is 0, Strobe 0 is Active.

            if (((strobePattern >> i) & 1) === 0) {
                // Strobe i is Active (Low)
                for (let bit = 0; bit < 8; bit++) {
                    if (this.matrix[i][bit]) {
                        result &= ~(1 << bit);
                    }
                }
            }
        }
        return result;
    }
}
