let isPausing = false;
const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

//#region SHARED FUNCTIONS
function generateRandomPassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createWebSocket({ encryptedToken, password, role, ownerKey, onOpen, onMessage, onClose, onError }) {
  const wsUrl = SESSION_SERVER_URL.replace('https', 'wss');
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    onOpen && onOpen(ws);

    // Authenticate
    const authPayload = {
      type: 'authenticate',
      encryptedToken,
      password,
      role,
    };
    if (role === 'host' && ownerKey) {
      authPayload.ownerKey = ownerKey;
    }
    ws.send(JSON.stringify(authPayload));
  });

  ws.addEventListener('message', (evt) => {
    onMessage && onMessage(ws, evt);
  });

  ws.addEventListener('close', (evt) => {
    onClose && onClose(ws, evt);
  });

  ws.addEventListener('error', (err) => {
    onError && onError(ws, err);
  });

  return ws;
}

async function doHandshake(role, password) {
  const response = await fetch(`${SESSION_SERVER_URL}/api/handshake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, role }),
  });
  if (!response.ok) {
    throw new Error(`Handshake failed with status ${response.status}`);
  }
  return response.json();
}
//#endregion SHARED FUNCTIONS

//#region HOST FUNCTIONS
async function hostCreateSession() {
  try {
    createSessionBtn.classList.add('hidden');
    log(hostLogsDiv, 'Creating a new Host session...');

    generatedPassword = generateRandomPassword();

    const data = await doHandshake('host', generatedPassword);
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
    setSessionStatus(window.i18n.t('session_status_initializing'), warningStatusTextColor);

    hostStartWebSocket();
  } catch (err) {
    log(hostLogsDiv, `Error creating session: ${err.message}`);
    createSessionBtn.classList.remove('hidden');
    await clearHostStorage();
  }
}

function hostStartWebSocket() {
  if (!encryptedToken || !generatedPassword) {
    log(hostLogsDiv, 'Missing token/password for host WS');
    return;
  }

  log(hostLogsDiv, 'Connecting to Session as Host...');
  ws = createWebSocket({
    encryptedToken,
    password: generatedPassword,
    role: 'host',
    ownerKey: ownerKey,
    onOpen: (wsInstance) => {
      log(hostLogsDiv, 'WebSocket open. Sending auth...');
    },
    onMessage: async (wsInstance, event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'authenticated') {
          clientId = data.clientId;
          await window.storage.set('host_clientId', clientId);

          log(hostLogsDiv, 'Authenticated. Session is now running.');
          setSessionStatus(window.i18n.t('session_status_running'), sucessStatusTextColor);
          deleteSessionBtn.classList.remove('hidden');
          pauseSessionBtn.classList.remove('hidden');
          sessionExpiryText.textContent = new Date(data.expiresAt).toLocaleString();
          sessionExpiryDiv.classList.remove('hidden');
          return;
        }

        if (data.type === 'clientList') {
          connectedClients = data.clients || [];
          updateClientConnectionsList();
          return;
        }

        if (data.type === 'clientConnected') {
          connectedClients.push(data.clientId);
          updateClientConnectionsList();
          log(hostLogsDiv, `Client connected: ${data.clientId}`);
          return;
        }

        if (data.type === 'clientDisconnected') {
          connectedClients = connectedClients.filter((cid) => cid !== data.clientId);
          updateClientConnectionsList();
          log(hostLogsDiv, `Client disconnected: ${data.clientId}`);
          return;
        }

        window.actionAPI.handleActionMessage(data, {
          onAction: (action, payload) => {
            log(hostLogsDiv, `Received action: ${action} with payload: ${JSON.stringify(payload)}`);
            const responsePayload = window.actionAPI.handleObsAction(action, payload);
            wsInstance.send(
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
      } catch (err) {
        wsInstance.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    },
    onClose: async (wsInstance, event) => {
      if (isPausing) {
        log(hostLogsDiv, 'Session paused');
        setSessionStatus(window.i18n.t('session_status_paused'), warningStatusTextColor);
        isPausing = false;
        return;
      }

      if (event.wasClean) {
        log(hostLogsDiv, 'Session Closed');
        setSessionStatus(window.i18n.t('session_status_closed'), warningStatusTextColor);
      } else {
        log(hostLogsDiv, 'Connection Lost');
        setSessionStatus(window.i18n.t('session_status_connection_failed'), failureStatusTextColor);
      }

      deleteSessionBtn.classList.add('hidden');
      pauseSessionBtn.classList.add('hidden');
      createSessionBtn.classList.remove('hidden');
      sessionTokenDiv.classList.add('hidden');
      sessionPasswordDiv.classList.add('hidden');
      sessionExpiryDiv.classList.add('hidden');
      sessionTokenField.textContent = '';
      sessionPasswordField.textContent = '';
      sessionExpiryText.textContent = '';

      connectedClients = [];
      updateClientConnectionsList();

      await clearHostStorage();
    },
    onError: (wsInstance, err) => {
      log(hostLogsDiv, `WebSocket error: ${err.message}`);
    },
  });
}

async function hostDeleteSession() {
  log(hostLogsDiv, 'Deleting Session...');
  setSessionStatus(window.i18n.t('session_status_closing'), warningStatusTextColor);

  if (!clientId || !ownerKey) {
    log(hostLogsDiv, 'Cannot delete session. Missing clientId or ownerKey.');
    return;
  }

  try {
    const response = await fetch(`${SESSION_SERVER_URL}/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, ownerKey }),
    });
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    if (ws) {
      ws.close();
    }
  } catch (err) {
    log(hostLogsDiv, `Error deleting session: ${err.message}`);
    setSessionStatus(window.i18n.t('session_status_error_deleting'), failureStatusTextColor);
  }
}

function hostPauseSession() {
  isPausing = true;
  log(hostLogsDiv, 'Pausing session...');
  if (ws) {
    ws.removeEventListener('close', ws.onclose);
    ws.close();
  }
  setSessionStatus(window.i18n.t('session_status_paused'), warningStatusTextColor);
}

function hostContinueSession() {
  if (!encryptedToken || !generatedPassword || !ownerKey) {
    log(hostLogsDiv, 'Cannot continue session. Missing token, password, or ownerKey.');
    return;
  }
  hostStartWebSocket();
}
//#endregion HOST FUNCTIONS

//#region CLIENT FUNCTIONS
async function clientJoinSession() {
  const sessionToken = sessionTokenField?.value.trim();
  const sessionPassword = sessionPasswordField?.value.trim();

  if (!sessionToken) log(clientLogsDiv, 'Session Token missing');
  if (!sessionPassword) log(clientLogsDiv, 'Session Password missing');
  if (!sessionToken || !sessionPassword) return;

  try {
    log(clientLogsDiv, 'Starting handshake...');
    await doHandshake('client', sessionPassword);

    ws = createWebSocket({
      encryptedToken: sessionToken,
      password: sessionPassword,
      role: 'client',
      onOpen: () => {
        log(clientLogsDiv, 'Session open. Authenticating as client...');
      },
      onMessage: async (wsInstance, event) => {
        try {
          const msg = JSON.parse(event.data);

          window.actionAPI.handleActionMessage(msg, {
            onResponse: (action, payload) => {
              log(clientLogsDiv, `Response - [${action}]: ${JSON.stringify(payload)}`);
            },
            onError: (error) => {
              log(clientLogsDiv, `Server error: ${error}`);
            },
            onAction: (action, payload) => {
              //TODO
            },
            onEvent: (eventName, payload) => {
              log(clientLogsDiv, `Event: ${eventName} - ${JSON.stringify(payload)}`);
            },
          });

          if (msg.type === 'authenticated') {
            log(clientLogsDiv, 'Authenticated as Client');
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
      },
      onClose: async () => {
        log(clientLogsDiv, 'Connection closed.');
        obsControllerDiv.classList.add('hidden');
        clientIdText.textContent = '';
        await clearClientStorage();
      },
      onError: (wsInstance, err) => {
        log(clientLogsDiv, `Session error: ${err.message}`);
      },
    });
  } catch (err) {
    log(clientLogsDiv, `Error joining session: ${err.message}`);
  }
}

function clientLeaveSession() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
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
  leaveSessionBtn.classList.add('hidden');
  joinSessionBtn.classList.remove('hidden');
}
//#endregion CLIENT FUNCTIONS
