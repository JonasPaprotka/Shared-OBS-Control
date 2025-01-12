
//#region HOST
async function clearHostStorage() {
  encryptedToken = null;
  sessionId = null;
  ownerKey = null;
  clientId = null;

  await window.storage.remove('host_sessionToken');
  await window.storage.remove('host_sessionPassword');
  await window.storage.remove('host_sessionId');
  await window.storage.remove('host_ownerKey');
  await window.storage.remove('host_clientId');
}

async function loadHostSessionData() {
  try {
    const loadedSessionToken = await window.storage.get('host_sessionToken');
    const loadedSessionPassword = await window.storage.get('host_sessionPassword');
    const loadedSessionId = await window.storage.get('host_sessionId');
    const loadedOwnerKey = await window.storage.get('host_ownerKey');
    const loadedClientId = await window.storage.get('host_clientId');

    if (!loadedSessionToken || !loadedSessionPassword || !loadedSessionId || !loadedOwnerKey || !loadedClientId) {
      return null;
    }

    return {
      sessionToken: loadedSessionToken,
      sessionPassword: loadedSessionPassword,
      sessionId: loadedSessionId,
      ownerKey: loadedOwnerKey,
      clientId: loadedClientId,
    };

  } catch {
    return null;
  }
}

function inputHostSessionData({ sessionToken, sessionPassword, sessionId, ownerKey, clientId }) {
  try {
    if (!sessionToken || !sessionPassword || !sessionId || !ownerKey || !clientId) {
      return false;
    }

    createSessionBtn.classList.add('hidden');
    continueSessionBtn.classList.remove('hidden');

    encryptedToken = sessionToken;
    sessionTokenField.value = sessionToken;
    generatedPassword = sessionPassword;
    sessionPasswordField.value = sessionPassword;
    clientId = clientId;

    sessionTokenDiv.classList.remove('hidden');
    sessionPasswordDiv.classList.remove('hidden');
    sessionTokenField.classList.remove('hidden');
    sessionPasswordField.classList.remove('hidden');

    return true;
  } catch (err) {
    console.error("Error inputting session data:", err);
    return false;
  }
}
//#endregion HOST

//#region CLIENT
async function clearClientStorage() {
  await window.storage.remove('client_sessionToken');
  await window.storage.remove('client_sessionId');
  await window.storage.remove('client_sessionPassword');
  await window.storage.remove('client_clientId');
}
//#endregion CLIENT