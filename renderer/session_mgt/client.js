let ws = null;
const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

const joinSessionBtn = document.getElementById('join-session-btn');
const actionSelect = document.getElementById('action-select');
const sendActionBtn = document.getElementById('send-action-btn');
const clientLogs = document.getElementById('client-logs');
const sessionTokenInput = document.getElementById('session-token');
const sessionPasswordInput = document.getElementById('session-password');
const actionArea = document.getElementById('action-area');
const obsController = document.getElementById('obs-controller');
const clientInformations = document.getElementById('client-informations');
const clientId = document.getElementById('client-id');
const sessionExpiryInfromations = document.getElementById('session-expiry-informations');
const sessionExpiry = document.getElementById('session-expiry');

function logClient(message) {
  if (!clientLogs) return;
  const time = new Date().toLocaleTimeString();
  clientLogs.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
  clientLogs.scrollTop = clientLogs.scrollHeight;
}

async function joinSession() {
  const sessionToken = sessionTokenInput?.value.trim();
  const sessionPassword = sessionPasswordInput?.value.trim();

  if (!sessionToken || !sessionPassword) {
    logClient('Token or password missing!');
    return;
  }

  try {
    logClient('Starting handshake...');

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

    const data = await response.json();
    logClient(`Handshake response: ${JSON.stringify(data)}`);

    const wsUrl = SESSION_SERVER_URL.replace('https', 'wss');
    ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      logClient('Session open. Authenticating...');
      ws.send(
        JSON.stringify({
          type: 'authenticate',
          encryptedToken: sessionToken,
          password: sessionPassword,
          role: 'client',
        })
      );
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);

        window.actionAPI.handleActionMessage(msg, {
          onResponse: (action, payload) => {
            logClient(`Response - [${action}]: ${JSON.stringify(payload)}`);
          },
          onError: (error) => {
            logClient(`Server error: ${error}`);
          },
          onAction: (action, payload) => {
            //TODO
          },
        });

        if (msg.type === 'authenticated') {
          logClient('Authenticated');

          let clientIdLabel = window.i18n.t('client_id_label') + ' ';
          if (clientId) clientId.textContent = clientIdLabel + msg.clientId;
          if (clientInformations) clientInformations.classList.remove('hidden');

          if (sessionExpiry) sessionExpiry.textContent = new Date(msg.expiresAt).toLocaleString();
          if (sessionExpiryInfromations) sessionExpiryInfromations.classList.remove('hidden');

          if (obsController) obsController.classList.remove('hidden');
          if (actionArea) actionArea.classList.remove('hidden');
        }
      } catch (err) {
        logClient(`Parsing error: ${err.message}`);
      }
    });

    ws.addEventListener('close', () => {
      logClient('Connection closed.');

      if (obsController) obsController.classList.add('hidden');
      if (clientId) clientId.textContent = '';
    });

    ws.addEventListener('error', (err) => {
      logClient(`Session error: ${err.message}`);
    });
  } catch (err) {
    logClient(`Error joining session: ${err.message}`);
  }
}

function sendSelectedAction(selectedAction) {
  let payload = {};

  if (selectedAction === 'SwitchToScene') {
    const sceneName = prompt('Enter the scene name:');
    if (!sceneName) {
      logClient('Scene name is required');
      return;
    }
    payload.sceneName = sceneName;
  }

  window.actionAPI.sendAction(selectedAction, payload);
  logClient(`Sent action: ${selectedAction} with payload: ${JSON.stringify(payload)}`);
}

function isConnected() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  const obsController_btn = document.getElementById('obs-controller-btn');
  if (obsController_btn) obsController_btn.addEventListener('click', obsController_btn_pressed);

  if (joinSessionBtn) joinSessionBtn.addEventListener('click', joinSession);
  if (sendActionBtn) sendActionBtn.addEventListener('click', () => {
      const selectedAction = actionSelect.value;
      sendSelectedAction(selectedAction);
    });
});

function obsController_btn_pressed() {
  if (!isConnected()) return;
  location.href = 'obs-controller.html';
}
