const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

const { sendAction, handleActionMessage } = require('./renderer/session_mgt/actionHandler.js');
const { obsManager } = require('./renderer/obs_mgt/obsManager.js');

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



const { OBSWebSocket } = require('obs-websocket-js');

const obs = new OBSWebSocket();

contextBridge.exposeInMainWorld('obsAPI', {
  connect: async (password) => {
    try {
      await obs.connect('ws://127.0.0.1:4455', password);
      return { success: true, message: 'Connected to OBS WebSocket successfully!' };
    } catch (error) {
      console.error('Failed to connect to OBS WebSocket:', error);
      return { success: false, message: error.message };
    }
  },
  disconnect: async () => {
    try {
      await obs.disconnect();
      return { success: true, message: 'Disconnected from OBS WebSocket.' };
    } catch (error) {
      console.error('Error disconnecting from OBS WebSocket:', error);
      return { success: false, message: error.message };
    }
  },
  onEvent: (eventName, callback) => {
    obs.on(eventName, callback);
  },
  offEvent: (eventName, callback) => {
    obs.off(eventName, callback);
  },
});