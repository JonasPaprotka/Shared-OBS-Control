const { autoUpdater } = require('electron-updater');

function checkForUpdates(mainWindow) {
  autoUpdater.checkForUpdates();

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', progress);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });

  autoUpdater.on('error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
  });
}

module.exports = { checkForUpdates };
