let ws = null;
const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

const joinSessionBtn = document.getElementById('join-session-btn');
const actionSelect = document.getElementById('action-select');
const sendActionBtn = document.getElementById('send-action-btn');
const clientLogs = document.getElementById('client-logs');
const sessionTokenInput = document.getElementById('session-token');
const sessionPasswordInput = document.getElementById('session-password');
const actionArea = document.getElementById('action-area');


function logClient(message) {
  if (!clientLogs) return;
  const time = new Date().toLocaleTimeString();
  clientLogs.innerHTML += `<div>[${time}] ${message}</div>`;
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
    logClient('Starting handshake (client role)...');

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
      logClient('WebSocket open. Authenticating as client...');
      ws.send(JSON.stringify({
        type: 'authenticate',
        encryptedToken: sessionToken,
        password: sessionPassword,
        role: 'client',
      }));
    });

    ws.addEventListener('message', (event) => {
      logClient(`WS message received: ${event.data}`);
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'authenticated') {
          logClient('Client authenticated successfully!');
          if (actionArea) actionArea.classList.remove('hidden');
        } else if (msg.type === 'response') {
          logClient(`Host responded to [${msg.action}]: ${JSON.stringify(msg.payload)}`);
        } else if (msg.type === 'error') {
          logClient(`Error from server: ${msg.error || msg.message}`);
        }
      } catch (err) {
        logClient(`Parsing error in WS message: ${err.message}`);
      }
    });

    ws.addEventListener('close', () => {
      logClient('WS closed. Attempting to rejoin in 3s...');
      setTimeout(joinSession, 3000);
    });

    ws.addEventListener('error', (err) => {
      logClient(`WebSocket error: ${err.message}`);
    });

  } catch (err) {
    logClient(`Error joining session: ${err.message}`);
  }
}

function sendAction() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    logClient('WebSocket is not connected!');
    return;
  }

  const selectedAction = actionSelect?.value;
  if (!selectedAction) {
    logClient('No action selected!');
    return;
  }

  ws.send(JSON.stringify({
    type: 'request',
    action: selectedAction,
    payload: {}
  }));
  logClient(`Sent action request: ${selectedAction}`);
}

if (joinSessionBtn) {
  joinSessionBtn.addEventListener('click', joinSession);
}
if (sendActionBtn) {
  sendActionBtn.addEventListener('click', sendAction);
}

document.addEventListener('DOMContentLoaded', async () => {

  // buttons
  const obsController_btn = document.getElementById('obs-controller-btn');
  if (obsController_btn) { obsController_btn.addEventListener('click', obsController_btn_pressed) }
});

function obsController_btn_pressed() {
  location.href='obs-controller.html';
}
