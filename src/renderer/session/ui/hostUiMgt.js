const createSessionBtn = document.getElementById('create-session-btn');
const closeSessionBtn = document.getElementById('close-session-btn');
const continueSessionBtn = document.getElementById('continue-session-btn');
const copySessionTokenValueBtn = document.getElementById('copy-session-token-btn');
const copySessionPasswordValueBtn = document.getElementById('copy-session-password-btn');
const togglePasswordBtn = document.getElementById('toggle-password-visibility-btn');

const sessionTokenField = document.getElementById('session-token-field');
const sessionPasswordField = document.getElementById('session-password-field');

const hostStatusText = document.getElementById('host-status-text');
const sessionExpiryText = document.getElementById('session-expiry-text');

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

function setStatus(message, color = null) {
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


document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  setStatus(window.i18n.t('session_status_closed'), warningStatusTextColor);

  // buttons
  createSessionBtn.addEventListener('click', createSession);
  closeSessionBtn.addEventListener('click', closeSession);
  continueSessionBtn.addEventListener('click', continueSession);
  copySessionTokenValueBtn.addEventListener('click', () => { navigator.clipboard.writeText(sessionTokenField.value) });
  copySessionPasswordValueBtn.addEventListener('click', () => { navigator.clipboard.writeText(sessionPasswordField.value) });

  togglePasswordBtn.addEventListener('click', () => {
    if (sessionPasswordField.type === 'password') {
      sessionPasswordField.type = 'text'; togglePasswordBtn.textContent = window.i18n.t('hide');
    } else { sessionPasswordField.type = 'password'; togglePasswordBtn.textContent = window.i18n.t('show'); }
  });
});
