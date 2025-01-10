let ws = null;
const SESSION_SERVER_URL = 'https://open-session-server-production.up.railway.app';

const joinSessionBtn = document.getElementById('join-session-btn');
const leaveSessionBtn = document.getElementById('leave-session-btn');
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
const togglePasswordBtn = document.getElementById('toggle-password-visibility-btn');

function logClient(message) {
  if (!clientLogs) return;
  const time = new Date().toLocaleTimeString();
  clientLogs.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
  clientLogs.scrollTop = clientLogs.scrollHeight;
}

async function joinSession() {
  const sessionToken = sessionTokenInput?.value.trim();
  const sessionPassword = sessionPasswordInput?.value.trim();

  if (!sessionToken) logClient('Session Token missing');
  if (!sessionPassword) logClient('Session Password missing');
  if (!sessionToken || !sessionPassword) return;

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
          clientId.textContent = clientIdLabel + msg.clientId;
          clientInformations.classList.remove('hidden');

          sessionExpiry.textContent = new Date(msg.expiresAt).toLocaleString();
          sessionExpiryInfromations.classList.remove('hidden');

          obsController.classList.remove('hidden');
          actionArea.classList.remove('hidden');

          joinSessionBtn.classList.add('hidden');
          leaveSessionBtn.classList.remove('hidden');
        }
      } catch (err) {
        logClient(`Parsing error: ${err.message}`);
      }
    });

    ws.addEventListener('close', () => {
      logClient('Connection closed.');

      obsController.classList.add('hidden');
      clientId.textContent = '';
    });

    ws.addEventListener('error', (err) => {
      logClient(`Session error: ${err.message}`);
    });
  } catch (err) {
    logClient(`Error joining session: ${err.message}`);
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
  logClient('Left the session.');

  obsController.classList.add('hidden');
  actionArea.classList.add('hidden');
  clientInformations.classList.add('hidden');
  sessionExpiryInfromations.classList.add('hidden');

  clientId.textContent = '';
   sessionExpiry.textContent = '';

  sessionTokenInput.disabled = false;
  sessionPasswordInput.disabled = false;

  leaveSessionBtn.classList.add('hidden');
  joinSessionBtn.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  const obsController_btn = document.getElementById('obs-controller-btn');
  obsController_btn.addEventListener('click', () => {
    if (!isConnected()) return;
    location.href = 'obs-controller.html';
  });

  joinSessionBtn.addEventListener('click', await joinSession);
  leaveSessionBtn.addEventListener('click', leaveSession);

  togglePasswordBtn.addEventListener('click', () => {
    if (sessionPasswordInput.type === 'password') { sessionPasswordInput.type = 'text'; togglePasswordBtn.textContent = window.i18n.t('hide');
    } else { sessionPasswordInput.type = 'password'; togglePasswordBtn.textContent = window.i18n.t('show');}
  });
});