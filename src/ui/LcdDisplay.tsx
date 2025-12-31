import { forwardRef } from 'react';

// Dumb wrapper for the Canvas
// Core Emu logic (Lcd.ts) will draw to this canvas.

export const LcdDisplay = forwardRef<HTMLCanvasElement>((_props, ref) => {
    return (
        <div className="lcd-container">
            {/* 
              PC-1403: 1 line, 24 characters, 5x7 dot matrix
              Pixels: 24 * 6 (5+1 spacing) = 144 width? 
              Let's allow the Lcd core to define strict pixel size.
            */}
            <canvas
                ref={ref}
                width={144} // 24 chars * 6 px
                height={8}  // 7 dots + 1 spacing
                className="lcd-canvas"
            />
        </div>
    );
});

LcdDisplay.displayName = 'LcdDisplay';
