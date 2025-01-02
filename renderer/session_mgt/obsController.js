let ws = null;
const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

const getVersionBtn = document.getElementById('get-version-btn');
const switchSceneBtn = document.getElementById('switch-scene-btn');
const sceneNameInput = document.getElementById('scene-name-input');
const controllerLogs = document.getElementById('controller-logs');

async function initializeController() {
  try {
    const { sessionToken, sessionPassword } = await window.authAPI.getSessionData();

    if (!sessionToken || !sessionPassword) {
      logController('Session token or password missing!');
      return;
    }

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
    logController(`Handshake response: ${JSON.stringify(data)}`);

    const wsUrl = SESSION_SERVER_URL.replace('https', 'wss');
    ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      logController('WebSocket connected. Authenticating...');
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

        if (msg.type === 'authenticated') {
          logController('Successfully authenticated with host.');
        }

        if (msg.type === 'response') {
          logController(`Response - [${msg.action}]: ${JSON.stringify(msg.payload)}`);
        } else if (msg.type === 'error') {
          logController(`Server error: ${msg.error || msg.message}`);
        }
      } catch (err) {
        logController(`Parsing error: ${err.message}`);
      }
    });

    ws.addEventListener('close', () => {
      logController('WebSocket connection closed.');
    });

    ws.addEventListener('error', (err) => {
      logController(`WebSocket error: ${err.message}`);
    });
  } catch (err) {
    logController(`Error initializing controller: ${err.message}`);
  }
}

function logController(message) {
  if (!controllerLogs) return;
  const time = new Date().toLocaleTimeString();
  controllerLogs.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
  controllerLogs.scrollTop = controllerLogs.scrollHeight;
}

function sendGetVersion() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    logController('WebSocket is not open.');
    return;
  }

  window.actionAPI.sendAction('GetVersion');
  logController('Sent action: GetVersion');
}

function sendSwitchScene() {
  const sceneName = sceneNameInput?.value.trim();
  if (!sceneName) {
    logController('Scene name is required.');
    return;
  }

  window.actionAPI.sendAction('SwitchToScene', { sceneName });
  logController(`Sent action: SwitchToScene with payload: ${sceneName}`);
}

document.addEventListener('DOMContentLoaded', () => {
  initializeController();

  if (getVersionBtn) {
    getVersionBtn.addEventListener('click', sendGetVersion);
  }

  if (switchSceneBtn) {
    switchSceneBtn.addEventListener('click', sendSwitchScene);
  }
});
