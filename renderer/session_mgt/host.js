let encryptedToken = null;
let generatedPassword = null;
let ws = null;
let hostClientId = null;

const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

const createSessionBtn = document.getElementById('create-session-btn');
const closeSessionBtn = document.getElementById('close-session-btn');
const sessionTokenText = document.getElementById('session-token-text');
const sessionPasswordText = document.getElementById('session-password-text');
const sessionToken = document.getElementById('session-token');
const sessionPassword = document.getElementById('session-password');
const hostStatusText = document.getElementById('host-status-text');
const hostLogs = document.getElementById('host-logs');

function logHost(message) {
  if (!hostLogs) return;
  const time = new Date().toLocaleTimeString();
  hostLogs.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
  hostLogs.scrollTop = hostLogs.scrollHeight;
}

function setStatus(message) {
  if (message === '') return;
  if (hostStatusText) hostStatusText.textContent = message;
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
    if (createSessionBtn) createSessionBtn.classList.add('hidden');
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

    if (sessionTokenText) sessionTokenText.textContent = encryptedToken;
    if (sessionPasswordText) sessionPasswordText.textContent = generatedPassword;
    if (sessionToken) sessionToken.classList.remove('hidden');
    if (sessionPassword) sessionPassword.classList.remove('hidden');
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
        if (closeSessionBtn) closeSessionBtn.classList.remove('hidden');
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
    if (closeSessionBtn) closeSessionBtn.classList.add('hidden');
    if (createSessionBtn) createSessionBtn.classList.remove('hidden');

    if (sessionToken) sessionToken.classList.add('hidden');
    if (sessionPassword) sessionPassword.classList.add('hidden');
    if (sessionTokenText) sessionTokenText.textContent = '';
    if (sessionPasswordText) sessionPasswordText.textContent = '';
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

document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();
  setStatus(window.i18n.t('session_status_closed'));

  // buttons
  if (createSessionBtn) createSessionBtn.addEventListener('click', createSession);
  if (closeSessionBtn) closeSessionBtn.addEventListener('click', closeSessionBtnPressed);
});
