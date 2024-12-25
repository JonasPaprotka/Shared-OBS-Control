const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');

let mainWindow;

function initI18next(userLocale) {
  const normalizedLocale = userLocale.toLowerCase();

  const preloadLanguages = ['en'];
  if (normalizedLocale && normalizedLocale !== 'en') {
    preloadLanguages.push(normalizedLocale);
  }

  return i18next
    .use(Backend)
    .init({
      backend: {
        loadPath: path.join(__dirname, 'locales', '{{lng}}', 'ui.json'),
      },
      lng: 'en', // default language
      fallbackLng: 'en',
      preload: preloadLanguages,
      supportedLngs: ['en', 'de', 'cs', 'es', 'fr', 'it', 'ja', 'pl', 'pt', 'ru'],
      debug: false,
      interpolation: {
        escapeValue: false
      }
    });
}

function createMainWindow(appLocale) {
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
      sandbox: true,
      additionalArguments: [`--user-locale=${appLocale}`],
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

app.on('ready', () => {
  let userLocale = app.getLocaleCountryCode() || 'en';
  userLocale = userLocale.toLowerCase();

  initI18next(userLocale)
    .then(() => {
      createMainWindow(userLocale);

      autoUpdater.checkForUpdates();

      autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update-available', info);
      });

      autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update-progress', progress);
      });

      autoUpdater.on('update-downloaded', async (info) => {
        try {
          const title = i18next.t('update_dialog_title', { lng: userLocale });
          const message = i18next.t('update_dialog_message', { lng: userLocale, version: info.version });
          const detail = i18next.t('update_dialog_detail', { lng: userLocale });
          const buttons = [
            i18next.t('update_dialog_button_restart', { lng: userLocale }),
            i18next.t('update_dialog_button_later', { lng: userLocale })
          ];

          const dialogOpts = {
            type: 'info',
            buttons: buttons,
            title: title,
            message: message,
            detail: detail,
          };

          const returnValue = await dialog.showMessageBox(dialogOpts);
          if (returnValue.response === 0) autoUpdater.quitAndInstall();
        } catch (err) {
          console.error('Error showing update dialog:', err);
        }
      });

      autoUpdater.on('error', (err) => {
        const errorMessage = i18next.t('update_error_message', { lng: userLocale }) || err.message;
        mainWindow.webContents.send('update-error', errorMessage);
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
    const result = translator(key);
    return result;
  });
  
ipcMain.handle('get-resource-bundle', (event, lng) => {
    return i18next.getResourceBundle(lng, 'translation');
});
