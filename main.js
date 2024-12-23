const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let updateWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile('renderer/index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createUpdateWindow() {
    updateWindow = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        frame: false,
        webPreferences: {
            contextIsolation: true,
        },
    });

    updateWindow.loadFile('renderer/update.html');
}

app.on('ready', () => {
    if (app.isPackaged) { // Do not update when dev
        autoUpdater.checkForUpdates();

        autoUpdater.on('update-available', (info) => {
            if (!updateWindow) createUpdateWindow();
        });

        autoUpdater.on('update-downloaded', (info) => {
            autoUpdater.quitAndInstall();
        });

        autoUpdater.on('error', (error) => {
            if (updateWindow) updateWindow.close();
            createMainWindow();
        });
    } else {
        createMainWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('window-minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.minimize();
});

ipcMain.on('window-close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) window.close();
});
