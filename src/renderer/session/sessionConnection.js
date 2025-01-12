// CONSTANTS
const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

function generateRandomPassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

//#region HOST
async function createSession() {
  try {
    createSessionBtn.classList.add('hidden');
    log(hostLogsDiv, 'Creating a new Host session...');

    generatedPassword = generateRandomPassword();

    const response = await fetch(`${SESSION_SERVER_URL}/api/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: generatedPassword,
        role: 'host',
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    encryptedToken = data.encryptedToken;
    sessionId = data.sessionId;
    ownerKey = data.ownerKey;

    await window.storage.set('host_sessionToken', encryptedToken);
    await window.storage.set('host_sessionPassword', generatedPassword);
    await window.storage.set('host_sessionId', sessionId);
    await window.storage.set('host_ownerKey', ownerKey);

    sessionTokenField.value = encryptedToken;
    sessionPasswordField.value = generatedPassword;
    sessionTokenDiv.classList.remove('hidden');
    sessionPasswordDiv.classList.remove('hidden');
    setStatus(window.i18n.t('session_status_initializing'), warningStatusTextColor);

    startHostWebSocket();
  } catch (err) {
    log(hostLogsDiv, `Error creating session: ${err.message}`);
    if (createSessionBtn) createSessionBtn.classList.remove('hidden');

    await clearHostStorage();
  }
}

function startHostWebSocket() {
  if (!encryptedToken || !generatedPassword) return;

  log(hostLogsDiv, 'Connecting to Session...');
  const wsUrl = SESSION_SERVER_URL.replace('https', 'wss');
  ws = new WebSocket(wsUrl);
  window.hostWS = ws;

  ws.addEventListener('open', () => {
    log(hostLogsDiv, 'Session opened. Authenticating as host...');

    ws.send(
      JSON.stringify({
        type: 'authenticate',
        encryptedToken,
        password: generatedPassword,
        role: 'host',
        ownerKey
      })
    );
  });

  ws.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'authenticated') {
        clientId = data.clientId;
        await window.storage.set('host_clientId', clientId);

        log(hostLogsDiv, 'Authenticated. Session is now running');
        setStatus(window.i18n.t('session_status_running'), sucessStatusTextColor);
        closeSessionBtn.classList.remove('hidden');
        sessionExpiryText.textContent = new Date(data.expiresAt).toLocaleString();
        sessionExpiryDiv.classList.remove('hidden');
      }

      if (data.type === 'clientList') {
        connectedClients = data.clients || [];
        updateClientConnectionsList();
      }

      if (data.type === 'clientConnected') {
        connectedClients.push(data.clientId);
        updateClientConnectionsList();
        log(hostLogsDiv, `Client connected: ${data.clientId}`);
      }

      if (data.type === 'clientDisconnected') {
        connectedClients = connectedClients.filter(
          (clientId) => clientId !== data.clientId
        );
        updateClientConnectionsList();
        log(hostLogsDiv, `Client disconnected: ${data.clientId}`);
      }

      window.actionAPI.handleActionMessage(data, {
        onAction: (action, payload) => {
          log(hostLogsDiv, `Received action: ${action} with payload: ${JSON.stringify(payload)}`); //TODO remove
          const responsePayload = window.actionAPI.handleObsAction(action, payload);
          ws.send(
            JSON.stringify({
              type: 'response',
              action,
              clientId: data.clientId,
              payload: responsePayload,
            })
          );
        },
        onError: (error) => {
          log(hostLogsDiv, `Error from client: ${error}`);
        },
      });
    } catch (parseErr) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        })
      );
    }
  });

  ws.addEventListener('close', async (event) => {
    if (event.wasClean) {
      log(hostLogsDiv, 'Session Closed');
      setStatus(window.i18n.t('session_status_closed'), warningStatusTextColor);
    } else {
      log(hostLogsDiv, 'Connection Failed');
      setStatus(window.i18n.t('session_status_connection_failed'), failureStatusTextColor);
    }

    closeSessionBtn.classList.add('hidden');
    createSessionBtn.classList.remove('hidden');

    sessionTokenDiv.classList.add('hidden');
    sessionPasswordDiv.classList.add('hidden');
    sessionExpiryDiv.classList.add('hidden');
    sessionTokenField.textContent = '';
    sessionPasswordField.textContent = '';
    sessionExpiryText.textContent = '';

    connectedClients = [];
    updateClientConnectionsList();

    await clearHostStorage(); //TODO Deleted or Closed (Paused) Session -> Only clear when deleted
  });

  ws.addEventListener('error', (err) => {
    log(hostLogsDiv, `WebSocket error: ${err.message}`);
  });
}

async function closeSession() {
  log(hostLogsDiv, 'Closing Session...');
  setStatus(window.i18n.t('session_status_closing'), warningStatusTextColor);

  if (!clientId || !ownerKey) {
    log(hostLogsDiv, 'Cannot delete session.');
    return;
  }

  try {
    const response = await fetch(`${SESSION_SERVER_URL}/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: clientId, ownerKey: ownerKey })
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    if (ws) {
      ws.close();
    }

    await clearHostStorage();

  } catch (err) {
    log(hostLogsDiv, `Error deleting session: ${err.message}`);
    setStatus(window.i18n.t('session_status_error_deleting'), failureStatusTextColor);
  }
}
//#endregion HOST

//#region CLIENT
async function joinSession() {
  const sessionToken = sessionTokenField?.value.trim();
  const sessionPassword = sessionPasswordField?.value.trim();

  if (!sessionToken) log(clientLogsDiv, 'Session Token missing');
  if (!sessionPassword) log(clientLogsDiv, 'Session Password missing');
  if (!sessionToken || !sessionPassword) return;

  try {
    log(clientLogsDiv, 'Starting handshake...');

    const response = await fetch(`${SESSION_SERVER_URL}/api/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: sessionPassword,
        role: 'client',
      }),
    });

    if (!response.ok) {
      throw new Error(`Handshake failed with status ${response.status}`);
    }

    const wsUrl = SESSION_SERVER_URL.replace('https', 'wss');
    ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      log(clientLogsDiv, 'Session open. Authenticating...');
      ws.send(
        JSON.stringify({
          type: 'authenticate',
          encryptedToken: sessionToken,
          password: sessionPassword,
          role: 'client',
        })
      );
    });

    ws.addEventListener('message', async (event) => {
      try {
        const msg = JSON.parse(event.data);

        window.actionAPI.handleActionMessage(msg, {
          onResponse: (action, payload) => {
            log(clientLogsDiv, `Response - [${action}]: ${JSON.stringify(payload)}`); //TODO remove
          },
          onError: (error) => {
            log(clientLogsDiv, `Server error: ${error}`);
          },
          onAction: (action, payload) => {
            //TODO
          },
          onEvent: (eventName, payload) => {
            log(clientLogsDiv, `Event: ${eventName} - ${JSON.stringify(payload)}`);
          }
        });

        if (msg.type === 'authenticated') {
          log(clientLogsDiv, 'Authenticated');

          sessionId = msg.sessionId;
          clientId = msg.clientId;

          await window.storage.set('client_sessionToken', sessionToken);
          await window.storage.set('client_sessionId', sessionId);
          await window.storage.set('client_sessionPassword', sessionPassword);
          await window.storage.set('client_clientId', clientId);

          let clientIdLabel = window.i18n.t('client_id_label') + ' ';
          clientIdText.textContent = clientIdLabel + clientId;
          clientInformationsDiv.classList.remove('hidden');

          sessionExpiryText.textContent = new Date(msg.expiresAt).toLocaleString();
          sessionExpiryInfromationsDiv.classList.remove('hidden');

          obsControllerDiv.classList.remove('hidden');
          joinSessionBtn.classList.add('hidden');
          leaveSessionBtn.classList.remove('hidden');
        }
      } catch (err) {
        log(clientLogsDiv, `Parsing error: ${err.message}`);
      }
    });

    ws.addEventListener('close', async () => {
      log(clientLogsDiv, 'Connection closed.');

      obsControllerDiv.classList.add('hidden');
      clientIdText.textContent = '';

      await clearClientStorage();
    });

    ws.addEventListener('error', (err) => {
      log(clientLogsDiv, `Session error: ${err.message}`);
    });
  } catch (err) {
    log(clientLogsDiv, `Error joining session: ${err.message}`);
  }
}

function isConnected() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  return true;
}

function leaveSession() {
  if (!isConnected()) return;

  ws.close();
  ws = null;
  log(clientLogsDiv, 'Left the session.');

  obsControllerDiv.classList.add('hidden');
  clientInformationsDiv.classList.add('hidden');
  sessionExpiryInfromationsDiv.classList.add('hidden');

  clientIdText.textContent = '';
  sessionExpiryText.textContent = '';

  sessionTokenField.disabled = false;
  sessionPasswordField.disabled = false;
  clientInformationsDiv.classList.add('hidden');
  sessionExpiryInfromationsDiv.classList.add('hidden');
  leaveSessionBtn.classList.add('hidden');
  joinSessionBtn.classList.remove('hidden');
}
//#endregion CLIENT
