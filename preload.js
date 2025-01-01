const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

const { sendAction, handleActionMessage } = require('./renderer/session_mgt/actionHandler.js');
const { obsManager } = require('./renderer/session_mgt/obsManager.js');

const argLocale =
  process.argv.find((arg) => arg.startsWith('--user-locale='))?.split('=')[1] ||
  'en-US';

let translationDict = {};
let fallbackDict = {};

async function loadTranslations() {
  try {
    const resource = await ipcRenderer.invoke('get-resource-bundle', argLocale);
    translationDict = resource || {};

    if (argLocale !== 'en-US') {
      const fallbackResource = await ipcRenderer.invoke('get-resource-bundle', 'en-US');
      fallbackDict = fallbackResource || {};
    } else {
      fallbackDict = {};
    }

    console.log(`Loaded translations for locale "${argLocale}":`, translationDict);
    if (fallbackDict && Object.keys(fallbackDict).length > 0) {
      console.log(`Loaded fallback translations "en-US":`, fallbackDict);
    }
  } catch (err) {
    console.error('Error loading translation bundles:', err);
    translationDict = {};
    fallbackDict = {};
  }
}

function translate(key) {
  return translationDict[key] || fallbackDict[key] || key;
}

contextBridge.exposeInMainWorld('i18n', {
  load: loadTranslations,
  t: translate,
});

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),

  translate: async (lng, key) => {
    const result = await ipcRenderer.invoke('translate', { lng, key });
    return result;
  },

  getResourceBundle: async (lng) => {
    return ipcRenderer.invoke('get-resource-bundle', lng);
  },

  getDetectedLocale: () => argLocale,
});

contextBridge.exposeInMainWorld('actionAPI', {
  sendAction: (action, payload) => sendAction(action, payload),
  handleActionMessage: (data, handlers) => handleActionMessage(data, handlers),
  handleObsAction: (action, payload) => obsManager.handleAction(action, payload),
});

contextBridge.exposeInMainWorld('authAPI', {
  getSessionData: async () => {
    return await ipcRenderer.invoke('get-session-data');
  },
});
