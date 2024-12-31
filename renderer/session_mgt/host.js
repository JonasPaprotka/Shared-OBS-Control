let encryptedToken = null;
let generatedPassword = null;
let ws = null;

const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

const createSessionBtn = document.getElementById('create-session-btn');
const sessionInfoDiv = document.getElementById('session-info');
const sessionTokenText = document.getElementById('session-token-text');
const sessionPasswordText = document.getElementById('session-password-text');
const hostStatusText = document.getElementById('host-status-text');
const hostLogs = document.getElementById('host-logs');


function logHost(message) {
  if (!hostLogs) return;
  const time = new Date().toLocaleTimeString();
  hostLogs.innerHTML += `<div>[${time}] ${message}</div>`;
  hostLogs.scrollTop = hostLogs.scrollHeight;
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
    logHost('Creating a new Host session...');

    generatedPassword = generateRandomPassword();

    const response = await fetch(`${SESSION_SERVER_URL}/handshake`, {
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

    if (sessionInfoDiv) sessionInfoDiv.classList.remove('hidden');
    if (sessionTokenText) sessionTokenText.textContent = encryptedToken;
    if (sessionPasswordText) sessionPasswordText.textContent = generatedPassword;
    if (hostStatusText) hostStatusText.textContent = 'WebSocket: Initializing...';

    startHostWebSocket();
  } catch (err) {
    logHost(`Error creating session: ${err.message}`);
  }
}

function startHostWebSocket() {
  if (!encryptedToken) {
    return;
  }
  if (!generatedPassword) {
    return;
  }

  logHost('Connecting to WebSocket...');
  const wsUrl = SESSION_SERVER_URL.replace('https', 'wss');
  ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    logHost('WebSocket opened. Authenticating as host...');

    ws.send(JSON.stringify({
      type: 'authenticate',
      encryptedToken,
      password: generatedPassword,
      role: 'host',
    }));
  });

  ws.addEventListener('message', (event) => {
    logHost(`WS message received: ${event.data}`);

    try {
      const data = JSON.parse(event.data);

      if (data.type === 'authenticated') {
        if (hostStatusText) hostStatusText.textContent = 'Host Authenticated!';
      }

      if (data.type === 'forward') {
        logHost(`Forward from client: action=${data.action}, clientId=${data.clientId}`);
        let payload = {};

        switch (data.action) {
          case 'GetVersion':
            payload = { version: 'v0.1.0' };
            break;
          case 'TestConnection':
            payload = { message: 'Connection is OK' };
            break;
          case 'SomeCustomAction':
            payload = { response: 'Handled your custom action!' };
            break;
          default:
            payload = { error: 'Unknown action' };
            break;
        }

        ws.send(JSON.stringify({
          type: 'response',
          action: data.action,
          clientId: data.clientId,
          payload,
        }));
      }
    } catch (parseErr) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format in host'
      }));
    }
  });

  ws.addEventListener('close', () => {
    if (hostStatusText) hostStatusText.textContent = 'Disconnected. Reconnecting in 3s...';
    logHost('WebSocket closed. Will retry in 3 seconds...');
    setTimeout(startHostWebSocket, 3000);
  });

  ws.addEventListener('error', (err) => {
    logHost(`WebSocket error: ${err.message}`);
  });
}

if (createSessionBtn) {
  createSessionBtn.addEventListener('click', createSession);
}
