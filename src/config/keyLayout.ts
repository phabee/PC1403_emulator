export interface KeyPosition {
    name: string;
    label: string;
    top: number; // Percentage
    left: number; // Percentage
    width: number; // Percentage
    height: number; // Percentage
}

// Refined Layout for Sharp PC-1403
// Using constants for easier adjustment

const ROW_HEIGHT = 10; // % distance between rows
const COL_WIDTH = 5.8;   // % distance between columns (Slightly narrower than 6 to fit 10 keys)
const KEY_W = 5;       // % width of key
const KEY_H = 8;       // % height of key

// Start offsets
// Scientific Row
const SCI_START_Y = 38;
const SCI_START_X = 14;

const QWERTY_START_Y = 50;
const QWERTY_START_X = 14;

// Numpad
const NUMPAD_START_X = 80;
const NUMPAD_COL_W = 5;
const NUMPAD_KEY_W = 4.5;
const NUMPAD_START_Y = 50;

export const KEY_LAYOUT: KeyPosition[] = [
    // --- Top Control Row (Small Keys, very top) ---
    // Often DEF, SHIFT are small round keys or rectangular at top left?
    // Let's place them at 28% Y
    { name: 'DEF', label: 'DEF', top: 28, left: 14, width: 4, height: 6 },
    { name: 'SHIFT', label: 'SHIFT', top: 28, left: 20, width: 4, height: 6 },
    { name: 'OFF', label: 'OFF', top: 28, left: 86, width: 4, height: 6 }, // Far right top
    { name: 'ON', label: 'ON', top: 28, left: 92, width: 4, height: 6 },

    // --- Scientific / Function Row (Above QWERTY) ---
    // hyp, sin, cos, tan, C-CE...
    ...['hyp', 'sin', 'cos', 'tan', 'C-CE', '->', 'EXP', 'yx', 'sqr', 'F-E'].map((k, i) => ({
        name: k, label: k,
        top: SCI_START_Y,
        left: SCI_START_X + (i * 6), // Spaced out
        width: 5, height: 8
    })),

    // --- Main Block (QWERTY) ---
    // Row 1: Q W E R T Y U I O P
    ...['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((k, i) => ({
        name: k, label: k,
        top: QWERTY_START_Y,
        left: QWERTY_START_X + (i * COL_WIDTH),
        width: KEY_W, height: 10
    })),

    // Row 2: A S D F G H J K L
    ...['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((k, i) => ({
        name: k, label: k,
        top: QWERTY_START_Y + ROW_HEIGHT,
        left: QWERTY_START_X + 2 + (i * COL_WIDTH),
        width: KEY_W, height: 10
    })),
    // Enter (spanning)
    { name: 'ENTER', label: 'ENTER', top: QWERTY_START_Y + ROW_HEIGHT, left: QWERTY_START_X + 2 + (9 * COL_WIDTH), width: 10, height: 10 },

    // Row 3: Z X C V B N M , SPC
    ...['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((k, i) => ({
        name: k, label: k,
        top: QWERTY_START_Y + (ROW_HEIGHT * 2),
        left: QWERTY_START_X + 4 + (i * COL_WIDTH),
        width: KEY_W, height: 10
    })),
    // Space
    { name: 'SPC', label: 'SPC', top: QWERTY_START_Y + (ROW_HEIGHT * 2), left: QWERTY_START_X + 4 + (7 * COL_WIDTH), width: 14, height: 10 },


    // --- Numpad (Right Side) ---
    // 7 8 9 /
    ...['7', '8', '9', '/'].map((k, i) => ({
        name: k, label: k,
        top: NUMPAD_START_Y,
        left: NUMPAD_START_X + (i * NUMPAD_COL_W),
        width: NUMPAD_KEY_W, height: KEY_H
    })),
    // 4 5 6 *
    ...['4', '5', '6', '*'].map((k, i) => ({
        name: k, label: k,
        top: NUMPAD_START_Y + ROW_HEIGHT,
        left: NUMPAD_START_X + (i * NUMPAD_COL_W),
        width: NUMPAD_KEY_W, height: KEY_H
    })),
    // 1 2 3 -
    ...['1', '2', '3', '-'].map((k, i) => ({
        name: k, label: k,
        top: NUMPAD_START_Y + (ROW_HEIGHT * 2),
        left: NUMPAD_START_X + (i * NUMPAD_COL_W),
        width: NUMPAD_KEY_W, height: KEY_H
    })),
    // 0 . + =
    ...['0', '.', '+', '='].map((k, i) => ({
        name: k, label: k,
        top: NUMPAD_START_Y + (ROW_HEIGHT * 3),
        left: NUMPAD_START_X + (i * NUMPAD_COL_W),
        width: NUMPAD_KEY_W, height: KEY_H
    })),
];
