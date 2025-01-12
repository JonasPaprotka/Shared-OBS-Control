const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const fs = require('fs');
const { setupStorageIpc } = require('./storage.js');

let mainWindow;

function initI18next(userLocale) {
  const defaultLanguage = 'en-US';
  const preloadLanguages = [defaultLanguage];

  if (userLocale !== defaultLanguage) {
    preloadLanguages.push(userLocale);
  }

  return i18next
    .use(Backend)
    .init({
      backend: {
        loadPath: path.join(__dirname, '../../locales', '{{lng}}', 'ui.json'),
      },
      lng: userLocale || defaultLanguage,
      fallbackLng: defaultLanguage,
      preload: preloadLanguages,
      supportedLngs: getSupportedLngs(),
      debug: false,
      interpolation: {
        escapeValue: false
      }
    });
}

function getLocaleCode() {
  return Intl.DateTimeFormat().resolvedOptions().locale;
}

function getSupportedLngs() {
  const lngPath = path.join(__dirname, '../../locales');
  const lngs = fs.readdirSync(lngPath, { withFileTypes: true });
  const supportedLngs = lngs
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return supportedLngs;
}

function createMainWindow(appLocale) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 675,
    minWidth: 675,
    minHeight: 400,
    roundedCorners: true,
    frame: false,
    icon: path.join(__dirname, '../../assets', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [`--user-locale=${appLocale}`],
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  const localeCode = getLocaleCode();

  initI18next(localeCode)
    .then(() => {
      createMainWindow(localeCode);

      autoUpdater.checkForUpdates();

      autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update-available', info);
      });

      autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update-progress', progress);
      });

      autoUpdater.on('update-downloaded', async (info) => {
        try {
          const title = i18next.t('update_dialog_title');
          const message = i18next.t('update_dialog_message', { version: info.version });
          const detail = i18next.t('update_dialog_detail');
          const buttons = [
            i18next.t('update_dialog_button_restart'),
            i18next.t('update_dialog_button_later')
          ];

          const dialogOpts = {
            type: 'info',
            buttons,
            title,
            message,
            detail,
          };

          const returnValue = await dialog.showMessageBox(dialogOpts);
          if (returnValue.response === 0) autoUpdater.quitAndInstall();
        } catch (err) {
          console.error('Error showing update dialog:', err);
        }
      });

      autoUpdater.on('error', (err) => {
        const errorMessage = i18next.t('update_error_message') || err.message;
        mainWindow.webContents.send('update-error', errorMessage);
      });
    })
    .catch((err) => {
      console.error('i18next init error:', err);
      app.quit();
    });

    setupStorageIpc(app);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Title bar
ipcMain.on('window-minimize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) window.minimize();
});

ipcMain.on('window-close', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) window.close();
});

// Translations
ipcMain.handle('translate', (event, { key }) => {
  const result = i18next.t(key);
  return result;
});

ipcMain.handle('get-resource-bundle', (event, lng) => {
  return i18next.getResourceBundle(lng, 'translation');
});

// Version
ipcMain.handle('get-version', () => {
  return app.getVersion();
});
