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


function logClient(message) {
  if (!clientLogs) return;
  const time = new Date().toLocaleTimeString();
  clientLogs.innerHTML += `<div id="logs">[${time}] ${message}</div>`;
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

    const response = await fetch(`${SESSION_SERVER_URL}/handshake`, {
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
          logClient('Successfully authenticated!');
          if (obsController) obsController.classList.remove('hidden');
          if (actionArea) actionArea.classList.remove('hidden');
        }
      } catch (err) {
        logClient(`Parsing error: ${err.message}`);
      }
    });

    ws.addEventListener('close', () => {
      if (obsController) obsController.classList.add('hidden');
      logClient('Connection closed.');
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

  // buttons
  const obsController_btn = document.getElementById('obs-controller-btn');

  if (obsController_btn) obsController_btn.addEventListener('click', obsController_btn_pressed);
  if (joinSessionBtn) joinSessionBtn.addEventListener('click', joinSession);
  if (sendActionBtn)
    sendActionBtn.addEventListener('click', () => {
      const selectedAction = actionSelect.value;
      sendSelectedAction(selectedAction);
    });
});

function obsController_btn_pressed() {
  if (!isConnected()) return;
  location.href = 'obs-controller.html';
}
