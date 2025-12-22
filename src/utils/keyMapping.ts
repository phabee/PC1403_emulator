export function mapPhysicalKey(e: KeyboardEvent): string | null {
    const code = e.code;
    const key = e.key.toUpperCase();

    // Special mappings
    if (code === 'Backspace') return 'DEL'; // Or Left Arrow on some? MAME says LEFT/DEL are shared?
    if (code === 'Enter') return 'ENTER';
    if (code === 'Space') return 'SPC';
    if (code === 'ArrowUp') return 'UP';
    if (code === 'ArrowDown') return 'DOWN';
    if (code === 'ArrowLeft') return 'LEFT';
    if (code === 'ArrowRight') return 'RIGHT';

    // Numbers
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    if (code.startsWith('Numpad')) return code.replace('Numpad', '');

    // Letters
    if (code.startsWith('Key')) return code.replace('Key', '');

    // Symbols (Adjust as needed based on KEY_MAP in core)
    if (key === '.') return '.';
    if (key === '=') return '=';
    if (key === '+') return '+';
    if (key === '-') return '-';
    if (key === '*') return '*';
    if (key === '/') return '/';

    // PC-1403 specific top row (F-keys?)
    if (code === 'F1') return 'DEF';
    if (code === 'F2') return 'SHIFT';
    if (code === 'F3') return 'BRK';

    // Default fallback: Try the single letter
    if (key.length === 1) return key;

    return null;
}
