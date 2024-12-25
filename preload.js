const { contextBridge, ipcRenderer } = require('electron');

const argLocale = process.argv
  .find(arg => arg.startsWith('--user-locale='))
  ?.split('=')[1] || '';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),

  translate: async (lng, key) => {
    return ipcRenderer.invoke('translate', { lng, key });
  },
  getResourceBundle: async (lng) => {
    return ipcRenderer.invoke('get-resource-bundle', lng);
  },

  getDetectedLocale: () => argLocale,
});
