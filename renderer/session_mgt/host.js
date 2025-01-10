let encryptedToken = null;
let generatedPassword = null;
let ws = null;
let hostClientId = null;
let connectedClients = [];

const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

const createSessionBtn = document.getElementById('create-session-btn');
const closeSessionBtn = document.getElementById('close-session-btn');
const sessionTokenField = document.getElementById('session-token-field');
const copySessionTokenValueBtn = document.getElementById('copy-session-token-btn');
const sessionPasswordField = document.getElementById('session-password-field');
const copySessionPasswordValueBtn = document.getElementById('copy-session-password-btn');
const sessionToken = document.getElementById('session-token');
const sessionPassword = document.getElementById('session-password');
const hostStatusText = document.getElementById('host-status-text');
const hostLogs = document.getElementById('host-logs');
const sessionExpiryDiv = document.getElementById('session-expiry-div');
const sessionExpiryText = document.getElementById('session-expiry-text');
const togglePasswordBtn = document.getElementById('toggle-password-visibility-btn');
const clientConnectionsDiv = document.getElementById('client-connections');

function logHost(message) {
  if (!hostLogs) return;
  const time = new Date().toLocaleTimeString();
  hostLogs.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
  hostLogs.scrollTop = hostLogs.scrollHeight;
}

function setStatus(message) {
  if (message === '') return;
  hostStatusText.textContent = message;
}

function generateRandomPassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createSession() {
  try {
    createSessionBtn.classList.add('hidden');
    logHost('Creating a new Host session...');

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

    sessionTokenField.value = encryptedToken;
    sessionPasswordField.value = generatedPassword;
    sessionToken.classList.remove('hidden');
    sessionPassword.classList.remove('hidden');
    setStatus(window.i18n.t('session_status_initializing'));

    startHostWebSocket();
  } catch (err) {
    logHost(`Error creating session: ${err.message}`);
    if (createSessionBtn) createSessionBtn.classList.remove('hidden');
  }
}

function startHostWebSocket() {
  if (!encryptedToken || !generatedPassword) return;

  logHost('Connecting to Session...');
  const wsUrl = SESSION_SERVER_URL.replace('https', 'wss');
  ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    logHost('Session opened. Authenticating as host...');

    ws.send(
      JSON.stringify({
        type: 'authenticate',
        encryptedToken,
        password: generatedPassword,
        role: 'host',
      })
    );
  });

  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'authenticated') {
        hostClientId = data.clientId;

        logHost('Authenticated. Session is now running');
        setStatus(window.i18n.t('session_status_running'));
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
        logHost(`Client connected: ${data.clientId}`);
      }

      if (data.type === 'clientDisconnected') {
        connectedClients = connectedClients.filter(
          (clientId) => clientId !== data.clientId
        );
        updateClientConnectionsList();
        logHost(`Client disconnected: ${data.clientId}`);
      }

      window.actionAPI.handleActionMessage(data, {
        onAction: (action, payload) => {
          logHost(`Received action: ${action} with payload: ${JSON.stringify(payload)}`);
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
          logHost(`Error from client: ${error}`);
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

  ws.addEventListener('close', () => {
    logHost('Session Deleted');
    setStatus(window.i18n.t('session_status_closed'));
    closeSessionBtn.classList.add('hidden');
    createSessionBtn.classList.remove('hidden');

    sessionToken.classList.add('hidden');
    sessionPassword.classList.add('hidden');
    sessionExpiryDiv.classList.add('hidden');
    sessionTokenField.textContent = '';
    sessionPasswordField.textContent = '';
    sessionExpiryText.textContent = '';

    connectedClients = [];
    updateClientConnectionsList();
  });

  ws.addEventListener('error', (err) => {
    logHost(`WebSocket error: ${err.message}`);
  });
}

async function closeSessionBtnPressed() {
  logHost('Closing Session...');
  setStatus(window.i18n.t('session_status_closing'));

  if (!hostClientId) {
    logHost('No hostClientId found – cannot delete session.');
    return;
  }

  try {
    const response = await fetch(`${SESSION_SERVER_URL}/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: hostClientId }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    if (ws) {
      ws.close();
    }
  } catch (err) {
    logHost(`Error deleting session: ${err.message}`);
    setStatus(window.i18n.t('session_status_error_deleting'));
  }
}

function updateClientConnectionsList() {
  const clientConnectionsDiv = document.getElementById('client-connections');
  clientConnectionsDiv.innerHTML = '';

  connectedClients.forEach((clientId) => {
    const item = document.createElement('div');
    item.classList.add('mb-1', 'selectable');
    item.innerText = `Client: ${clientId}`;
    clientConnectionsDiv.appendChild(item);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();
  setStatus(window.i18n.t('session_status_closed'));

  // buttons
  createSessionBtn.addEventListener('click', createSession);
  closeSessionBtn.addEventListener('click', closeSessionBtnPressed);
  copySessionTokenValueBtn.addEventListener('click', () => { navigator.clipboard.writeText(sessionTokenField.value) });
  copySessionPasswordValueBtn.addEventListener('click', () => { navigator.clipboard.writeText(sessionPasswordField.value) });

  togglePasswordBtn.addEventListener('click', () => {
    if (sessionPasswordField.type === 'password') { sessionPasswordField.type = 'text'; togglePasswordBtn.textContent = window.i18n.t('hide');
    } else { sessionPasswordField.type = 'password'; togglePasswordBtn.textContent = window.i18n.t('show');}
  });
});
