const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');

const userLocale = app.getLocaleCountryCode();
let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 675,
    minWidth: 1200,
    minHeight: 675,
    roundedCorners: true,
    frame: false,
    icon: path.join(__dirname, 'assets', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--user-locale=${userLocale}`]
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initI18next() {
  return i18next
    .use(Backend)
    .init({
      backend: {
        loadPath: path.join(__dirname, 'locales', '{{lng}}', 'ui.json'),
      },
      lng: 'en', // default language
      fallbackLng: 'en',
    });
}

app.on('ready', () => {
  initI18next()
    .then(() => {
      createMainWindow();

      autoUpdater.checkForUpdates();

      autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update-available', info);
      });

      autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update-progress', progress);
      });

      autoUpdater.on('update-downloaded', (info) => {
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
        mainWindow.webContents.send('update-error', err.message);
      });
    })
    .catch((err) => {
      console.error('i18next init error:', err);
      app.quit();
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

ipcMain.handle('translate', (event, { key, lng }) => {
  const translator = i18next.getFixedT(lng);
  return translator(key);
});

ipcMain.handle('get-resource-bundle', (event, lng) => {
  return i18next.getResourceBundle(lng, 'translation');
});
