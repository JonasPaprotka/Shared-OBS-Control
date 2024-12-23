const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

let mainWindow;

// logging
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs', 'main.log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

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

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', () => {
    log.info('Application starting...');
    createMainWindow();

    autoUpdater.checkForUpdates();

    autoUpdater.on('update-available', (info) => {
        log.info(`Update available: ${info.version}`);
        mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('download-progress', (progress) => {
        log.info(`Download progress: ${progress.percent.toFixed(2)}%`);
        mainWindow.webContents.send('update-progress', progress);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded. Prompting user to install...');
        const dialogOpts = {
            type: 'info',
            buttons: ['Restart', 'Later'],
            title: 'Application Update',
            message: `Version ${info.version} is ready to install.`,
            detail: 'The update will be applied after restarting the application.',
        };

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
            if (returnValue.response === 0) autoUpdater.quitAndInstall();
        });
    });

    autoUpdater.on('error', (err) => {
        log.error(`Update error: ${err.message}`);
        mainWindow.webContents.send('update-error', err.message);
    });
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
