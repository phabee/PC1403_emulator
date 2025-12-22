import { useEffect, useRef, useState } from 'react';
import './App.css';
import { Emulator } from './core/Emulator';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorRef = useRef<Emulator | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (canvasRef.current && !emulatorRef.current) {
      emulatorRef.current = new Emulator(canvasRef.current);
    }

    return () => {
      emulatorRef.current?.stop();
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
        <img src="/pc1403_faceplate.jpg" className="faceplate-bg" alt="PC-1403" />

        {/* LCD Layer */}
        <div className="lcd-container">
          <canvas ref={canvasRef} width={200} height={40} className="lcd-canvas" />
        </div>

        {/* Clickable Overlay Layer */}
        <div className="keys-overlay">
          {/* Example Power Button Area */}
          <div className="key-area power-btn" onClick={togglePower} title="Power ON/OFF"></div>

          {/* We will need to map all keys here */}
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
