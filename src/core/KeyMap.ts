export interface KeyMapping {
    strobe: number;
    bit: number;
}

// Extracted from MAME pocketc.cpp (Assuming KEYx corresponds to Strobe index x)
// Note: Some keys appear multiple times or in different positions?
// MAME:
// KEY0: 0x10=SHIFT, 0x20=W, 0x40=S, 0x80=X
// KEY1: 0x01=(, 0x02=/, 0x04=*, 0x08=-, 0x10=Z, 0x20=A, 0x40=Q
// KEY2: 0x01=., 0x02=8, 0x04=2, 0x08=5, 0x10=DEF, 0x20=Q, 0x40=A, 0x80=Z
// Wait, KEY2 repeats Q/A/Z? That's odd.
// Maybe physical wiring has them connected to multiple lines?
// For emulation, we'll map to the first occurrence or support both.
// Let's implement the list.

export const KEY_MAP: Record<string, KeyMapping> = {
    // Strobe 0
    "SHIFT": { strobe: 0, bit: 4 }, // 0x10
    "W": { strobe: 0, bit: 5 }, // 0x20
    "S": { strobe: 0, bit: 6 }, // 0x40
    "X": { strobe: 0, bit: 7 }, // 0x80

    // Strobe 1
    "(": { strobe: 1, bit: 0 },
    "/": { strobe: 1, bit: 1 },
    "*": { strobe: 1, bit: 2 },
    "-": { strobe: 1, bit: 3 },
    "Z": { strobe: 1, bit: 4 },
    "A": { strobe: 1, bit: 5 },
    "Q": { strobe: 1, bit: 6 },

    // Strobe 2
    ".": { strobe: 2, bit: 0 },
    "8": { strobe: 2, bit: 1 },
    "2": { strobe: 2, bit: 2 },
    "5": { strobe: 2, bit: 3 },
    "DEF": { strobe: 2, bit: 4 },
    // "Q": { strobe: 2, bit: 5 }, // Duplicate?
    // "A": { strobe: 2, bit: 6 }, // Duplicate?
    // "Z": { strobe: 2, bit: 7 }, // Duplicate?

    // Strobe 3
    // 0x01 Unused
    "7": { strobe: 3, bit: 1 },
    "1": { strobe: 3, bit: 2 },
    "4": { strobe: 3, bit: 3 },
    "UP": { strobe: 3, bit: 4 },
    "R": { strobe: 3, bit: 5 },
    "F": { strobe: 3, bit: 6 },
    "V": { strobe: 3, bit: 7 },

    // Strobe 4
    // 0x03 Unused
    "=": { strobe: 4, bit: 2 },
    "P": { strobe: 4, bit: 3 },
    "LEFT": { strobe: 4, bit: 4 },
    "T": { strobe: 4, bit: 5 },
    "G": { strobe: 4, bit: 6 },
    "B": { strobe: 4, bit: 7 },

    // Strobe 5
    // 0x07 Unused
    "O": { strobe: 5, bit: 3 },
    "RIGHT": { strobe: 5, bit: 4 },
    "Y": { strobe: 5, bit: 5 },
    "H": { strobe: 5, bit: 6 },
    "N": { strobe: 5, bit: 7 },

    // Strobe 6
    // 0x1F Unused (0x10 Down? MAME comments)
    "DOWN": { strobe: 6, bit: 4 }, // Guessing from unused comment or logic?
    "U": { strobe: 6, bit: 5 },
    "J": { strobe: 6, bit: 6 },
    "M": { strobe: 6, bit: 7 },

    // Strobe 7
    // 0x1F Unused
    "I": { strobe: 7, bit: 5 },
    "K": { strobe: 7, bit: 6 },
    "SPC": { strobe: 7, bit: 7 },

    // Strobe 8
    // 0x3F Unused
    "L": { strobe: 8, bit: 6 },
    "ENTER": { strobe: 8, bit: 7 },

    // Strobe 9
    // 0x7F Unused
    "0": { strobe: 9, bit: 7 },

    // Strobe 10 (EXTRA/MODE?) - Usually mapped specially or high strobe
    "BRK": { strobe: 10, bit: 0 }, // KEY_EXTRA 0x01
    "CLS": { strobe: 10, bit: 1 }, // Assumption: CLS next to BRK?
    "ON": { strobe: 10, bit: 0 }, // Map ON to BRK for now
    "CAL": { strobe: 11, bit: 0 }, // Mode switch?
    "BASIC": { strobe: 11, bit: 1 },
};
