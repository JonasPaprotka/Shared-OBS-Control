//#region HOST
async function clearHostSessionStorage(dontClearLogs = true) {
  encryptedToken = null;
  sessionId = null;
  ownerKey = null;
  clientId = null;

  await window.storage.remove('host_sessionToken');
  await window.storage.remove('host_sessionPassword');
  await window.storage.remove('host_sessionId');
  await window.storage.remove('host_ownerKey');
  await window.storage.remove('host_clientId');

  if (dontClearLogs) return;
  await window.storage.remove('host_logs');
}

async function loadHostSessionData() {
  try {
    const loadedSessionToken = await window.storage.get('host_sessionToken');
    const loadedSessionPassword = await window.storage.get('host_sessionPassword');
    const loadedSessionId = await window.storage.get('host_sessionId');
    const loadedOwnerKey = await window.storage.get('host_ownerKey');
    const loadedClientId = await window.storage.get('host_clientId');
    const loadedHostLogs = await window.storage.get('host_logs');

    if (!loadedSessionToken || !loadedSessionPassword || !loadedSessionId || !loadedOwnerKey || !loadedClientId) return null;
    return { loadedSessionToken, loadedSessionPassword, loadedSessionId, loadedOwnerKey, loadedClientId, loadedHostLogs };

  } catch {
    return null;
  }
}

async function inputHostSessionData({ loadedSessionToken, loadedSessionPassword, loadedSessionId, loadedOwnerKey, loadedClientId, loadedHostLogs }) {
  try {
    if (!loadedSessionToken || !loadedSessionPassword || !loadedSessionId || !loadedOwnerKey || !loadedClientId) return false;

    createSessionBtn.classList.add('hidden');
    deleteSessionBtn.classList.remove('hidden');
    resumeSessionBtn.classList.remove('hidden');

    encryptedToken = loadedSessionToken;
    generatedPassword = loadedSessionPassword;
    sessionId = loadedSessionId;
    ownerKey = loadedOwnerKey;
    clientId = loadedClientId;

    sessionTokenField.value = loadedSessionToken;
    sessionPasswordField.value = loadedSessionPassword;

    sessionTokenDiv.classList.remove('hidden');
    sessionPasswordDiv.classList.remove('hidden');
    sessionTokenField.classList.remove('hidden');
    sessionPasswordField.classList.remove('hidden');

    if (loadedHostLogs) {
      let allRows = '';
      for (let row of loadedHostLogs) {
        allRows += row;
      }
      hostLogsDiv.innerHTML += allRows;
      hostLogsDiv.scrollTop = hostLogsDiv.scrollHeight; // scroll to bottom
    }

    setSessionStatus(await window.i18n.t('session_status_paused'), warningStatusTextColor);

    return true;
  } catch (err) {
    console.error("Error inputting session data:", err);
    return false;
  }
}
//#endregion HOST

//#region CLIENT
async function clearClientStorage() {
  sessionToken = null;
  sessionPassword = null;

  await window.storage.remove('client_sessionToken');
  await window.storage.remove('client_sessionPassword');
}

async function loadClientSessionData() {
  try {
    const loadedSessionToken = await window.storage.get('client_sessionToken');
    const loadedSessionPassword = await window.storage.get('client_sessionPassword');
    const loadedClientLogs = await window.storage.get('client_logs');

    return { loadedSessionToken, loadedSessionPassword, loadedClientLogs };

  } catch {
    return null;
  }
}

async function inputClientSessionData({ loadedSessionToken, loadedSessionPassword, loadedClientLogs }) {
  try {
    sessionToken = loadedSessionToken;
    sessionPassword = loadedSessionPassword;

    sessionTokenField.value = sessionToken;
    sessionPasswordField.value = sessionPassword;

    if (loadedClientLogs) {
      let allRows = '';
      for (let row of loadedClientLogs) {
        allRows += row;
      }
      clientLogsDiv.innerHTML += allRows;
      clientLogsDiv.scrollTop = clientLogsDiv.scrollHeight; // scroll to bottom
    }

    return true;
  } catch (err) {
    console.error("Error inputting session data:", err);
    return false;
  }
}
//#endregion CLIENT