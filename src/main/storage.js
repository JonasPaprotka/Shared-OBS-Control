const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

function setupStorageIpc(app) {
  const storageFilePath = path.join(app.getPath('userData'), 'storage.json');

  function read() {
    try {
      if (!fs.existsSync(storageFilePath)) {
        fs.writeFileSync(storageFilePath, JSON.stringify({}));
      }
      const data = fs.readFileSync(storageFilePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Failed to read storage:', err);
      return {};
    }
  }

  function write(data) {
    try {
      fs.writeFileSync(storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Failed to write storage:', err);
      return false;
    }
  }

  function remove(key) {
    try {
      const storageData = read();
      if (key in storageData) {
        delete storageData[key];
        const success = write(storageData);
        return success ? { success: true } : { success: false, error: 'Failed to write data' };
      } else {
        return { success: false, error: 'Key not found' };
      }
    } catch (err) {
      console.error('Failed to delete data:', err);
      return { success: false, error: err.message };
    }
  }

  function clear() {
    try {
      const success = write({});
      return success ? { success: true } : { success: false, error: 'Failed to clear storage' };
    } catch (err) {
      console.error('Failed to clear data:', err);
      return { success: false, error: err.message };
    }
  }

  function add(key, value) {
    try {
      const storageData = read();
      if (!Array.isArray(storageData[key])) {
        storageData[key] = [];
      }
      storageData[key].push(value);
      const success = write(storageData);
      return success ? { success: true } : { success: false, error: 'Failed to write data' };
    } catch (err) {
      console.error('Failed to add to storage:', err);
      return { success: false, error: err.message };
    }
  }

  ipcMain.handle('storage-set', async (event, { key, value }) => {
    const storageData = read();
    storageData[key] = value;
    const success = write(storageData);
    return { success };
  });

  ipcMain.handle('storage-get', async (event, { key }) => {
    const storageData = read();
    return storageData[key];
  });

  ipcMain.handle('storage-remove', async (event, { key }) => {
    return remove(key);
  });

  ipcMain.handle('storage-clear', async () => {
    return clear();
  });

  ipcMain.handle('storage-add', async (event, { key, value }) => {
    try {
      const storageData = read();

      if (!Array.isArray(storageData[key])) {
        storageData[key] = [];
      }
      storageData[key].push(value);
      const success = write(storageData);
      return { success };
    } catch (err) {
      console.error('Failed to add to storage:', err);
      return { success: false, error: err.message };
    }
  });

}

module.exports = {
  setupStorageIpc,
};
