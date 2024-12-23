const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');

log.transports.file.resolvePath = () => path.join(require('electron').app.getPath('userData'), 'logs', 'update.log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

function checkForUpdates(mainWindow) {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdates();

    autoUpdater.on('update-available', (info) => {
        log.info(`Update available: ${info.version}`);
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info);
        }
    });

    autoUpdater.on('download-progress', (progress) => {
        log.info(`Download progress: ${progress.percent.toFixed(2)}%`);
        if (mainWindow) {
            mainWindow.webContents.send('update-progress', progress);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded. Ready to install.');
        if (mainWindow) {
            mainWindow.webContents.send('update-downloaded', info);
        }
    });

    autoUpdater.on('error', (error) => {
        log.error(`Update error: ${error.message}`);
        if (mainWindow) {
            mainWindow.webContents.send('update-error', error.message);
        }
    });
}

module.exports = { checkForUpdates };
