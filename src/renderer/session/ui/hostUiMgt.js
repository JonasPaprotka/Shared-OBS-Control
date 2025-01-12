const createSessionBtn = document.getElementById('create-session-btn');
const deleteSessionBtn = document.getElementById('delete-session-btn');
const continueSessionBtn = document.getElementById('continue-session-btn');
const pauseSessionBtn = document.getElementById('pause-session-btn');
const resumeSessionBtn = document.getElementById('resume-session-btn');
const copySessionTokenBtn = document.getElementById('copy-session-token-btn');
const copySessionPasswordBtn = document.getElementById('copy-session-password-btn');
const togglePasswordBtn = document.getElementById('toggle-password-visibility-btn');
const connectObsWebsocketBtn = document.getElementById('connect-obs-websocket-btn');
const disconnectObsWebsocketBtn = document.getElementById('disconnect-obs-websocket-btn');

const sessionTokenField = document.getElementById('session-token-field');
const sessionPasswordField = document.getElementById('session-password-field');
const obsWebsocketPasswordField = document.getElementById('obs-websocket-password');

const hostStatusText = document.getElementById('host-status-text');
const sessionExpiryText = document.getElementById('session-expiry-text');
const obsStatusText = document.getElementById('obs-status-text');

const sessionTokenDiv = document.getElementById('session-token');
const sessionPasswordDiv = document.getElementById('session-password');
const hostLogsDiv = document.getElementById('host-logs');
const sessionExpiryDiv = document.getElementById('session-expiry-div');
const clientConnectionsDiv = document.getElementById('client-connections');


function updateClientConnectionsList() {
  clientConnectionsDiv.innerHTML = '';

  connectedClients.forEach((clientId) => {
    const item = document.createElement('div');
    item.classList.add('mb-1', 'selectable');
    item.innerText = `Client: ${clientId}`;
    clientConnectionsDiv.appendChild(item);
  });
}

function setSessionStatus(message, color = null) {
  if (message === '') return;
  hostStatusText.textContent = message;

  if (!color) return;
  hostStatusText.classList.forEach((className) => {
    if (className.startsWith('text-')) {
      hostStatusText.classList.remove(className);
    }
  });
  hostStatusText.classList.add(color);
}

function setObsWebsocketStatus(message, color = null) {
  if (message === '') return;
  obsStatusText.textContent = message;

  if (!color) return;
  obsStatusText.classList.forEach((className) => {
    if (className.startsWith('text-')) {
      obsStatusText.classList.remove(className);
    }
    obsStatusText.classList.add(color);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  setSessionStatus(await window.i18n.t('session_status_closed'), warningStatusTextColor);
  setObsWebsocketStatus(await window.i18n.t('not_connected_to_obs'), warningStatusTextColor)

  // buttons
  createSessionBtn.addEventListener('click', hostCreateSession);
  deleteSessionBtn.addEventListener('click', hostDeleteSession);
  continueSessionBtn.addEventListener('click', hostContinueSession);
  copySessionTokenBtn.addEventListener('click', () => { navigator.clipboard.writeText(sessionTokenField.value) });
  copySessionPasswordBtn.addEventListener('click', () => { navigator.clipboard.writeText(sessionPasswordField.value) });

  togglePasswordBtn.addEventListener('click', () => {
    if (sessionPasswordField.type === 'password') {
      sessionPasswordField.type = 'text'; togglePasswordBtn.textContent = window.i18n.t('hide');
    } else { sessionPasswordField.type = 'password'; togglePasswordBtn.textContent = window.i18n.t('show'); }
  });

  pauseSessionBtn.addEventListener('click', () => {
    pauseSessionBtn.classList.add('hidden');
    resumeSessionBtn.classList.remove('hidden');
    hostPauseSession();
  });

  resumeSessionBtn.addEventListener('click', () => {
    resumeSessionBtn.classList.add('hidden');
    pauseSessionBtn.classList.remove('hidden');
    hostContinueSession();
  });
});
