let encryptedToken = null;
let generatedPassword = null;
let sessionId = null;
let ownerKey = null;
let ws = null;
let clientId = null;
let connectedClients = [];

document.addEventListener('DOMContentLoaded', async () => {
  const loadedValues = await loadHostSessionData();
  if (loadedValues) {
    inputHostSessionData(loadedValues);
  }

  loadedObsWebsocketPassword = await window.storage.get('obsWebsocket_password');
  if (loadedObsWebsocketPassword) obsWebsocketPasswordField.value = loadedObsWebsocketPassword;
});
