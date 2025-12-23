import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Emulator } from './core/Emulator';
import faceplateWith from './assets/pc1403_faceplate.jpg';
import { mapPhysicalKey } from './utils/keyMapping';
import initialKeyLayout from './config/key_mapping.json';



function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorRef = useRef<Emulator | null>(null);
  const [running, setRunning] = useState(false);
  // const [keyLayout] = useState<KeyPosition[]>(initialKeyLayout); // Removed to allow HMR updates
  const keyLayout = initialKeyLayout;

  useEffect(() => {
    if (canvasRef.current && !emulatorRef.current) {
      emulatorRef.current = new Emulator(canvasRef.current);
    }

    return () => {
      emulatorRef.current?.stop();
    };
  }, []);



  // Keyboard Event Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!emulatorRef.current) return;
      const key = mapPhysicalKey(e);
      if (key) {
        emulatorRef.current.keyboard.setKey(key, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!emulatorRef.current) return;
      const key = mapPhysicalKey(e);
      if (key) {
        emulatorRef.current.keyboard.setKey(key, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const togglePower = () => {
    if (!emulatorRef.current) return;
    if (running) {
      emulatorRef.current.stop();
      setRunning(false);
    } else {
      emulatorRef.current.boot();
      setRunning(true);
    }
  };

  const handleRomUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && emulatorRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          const data = new Uint8Array(buffer);
          emulatorRef.current?.loadRom(data);
          alert('ROM Loaded. Turning on...');
          if (!running) {
            togglePower();
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="app-container">
      <div className="calculator-wrapper">
        {/* Background Image Layer */}
        <img src={faceplateWith} className="faceplate-bg" alt="PC-1403" />

        {/* LCD Layer */}
        <div className="lcd-container">
          <canvas ref={canvasRef} width={200} height={40} className="lcd-canvas" />
        </div>

        {/* Clickable Overlay Layer */}
        <div className="keys-overlay">
          {/* Example Power Button Area */}
          <div className="key-area power-btn" onClick={togglePower} title="Power ON/OFF"></div>

          {keyLayout.map((k) => (
            <div
              key={k.name}
              className="key-area"
              style={{
                top: typeof k.top === 'number' ? `${k.top}%` : k.top,
                left: typeof k.left === 'number' ? `${k.left}%` : k.left,
                width: typeof k.width === 'number' ? `${k.width}%` : k.width,
                height: typeof k.height === 'number' ? `${k.height}%` : k.height,
              }}
              onMouseDown={() => emulatorRef.current?.keyboard.setKey(k.name, true)}
              onMouseUp={() => emulatorRef.current?.keyboard.setKey(k.name, false)}
              onMouseLeave={() => emulatorRef.current?.keyboard.setKey(k.name, false)}
              title={k.label}
            />
          ))}
        </div>
      </div>

      <div className="controls">
        <button onClick={togglePower}>{running ? 'Turn OFF' : 'Turn ON'}</button>
        <div style={{ marginTop: 10 }}>
          <label>Load ROM (bin): </label>
          <input type="file" accept=".bin,.rom" onChange={handleRomUpload} />
        </div>
        <p>Emulator Status: {running ? 'Running' : 'Stopped'}</p>
      </div>
    </div>
  );
}

export default App;
