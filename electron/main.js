import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true, // Empowering the emulator for local file access (MVP)
            contextIsolation: false,
        },
        autoHideMenuBar: true,
    });

    if (isDev) {
        // In dev, load from the Vite dev server
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // In prod, load from the dist folder
        // Note: requires correct relative path during build
        win.loadFile(path.join(__dirname, '../dist/index.html'));
        // Debugging: Enable DevTools in production for now
        win.webContents.openDevTools();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
