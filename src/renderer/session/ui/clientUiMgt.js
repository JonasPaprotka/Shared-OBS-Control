const joinSessionBtn = document.getElementById('join-session-btn');
const leaveSessionBtn = document.getElementById('leave-session-btn');
const sendActionBtn = document.getElementById('send-action-btn');
const togglePasswordBtn = document.getElementById('toggle-password-visibility-btn');
const obsControllerBtn = document.getElementById('obs-controller-btn');

const sessionTokenField = document.getElementById('session-token');
const sessionPasswordField = document.getElementById('session-password');

const clientIdText = document.getElementById('client-id');
const sessionExpiryText = document.getElementById('session-expiry');

const clientLogsDiv = document.getElementById('client-logs');
const obsControllerDiv = document.getElementById('obs-controller');
const clientInformationsDiv = document.getElementById('client-informations');
const sessionExpiryInfromationsDiv = document.getElementById('session-expiry-informations');


document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  obsControllerBtn.addEventListener('click', () => {
    if (!isConnected()) return;
    location.href = 'obs-controller.html';
  });

  joinSessionBtn.addEventListener('click', clientJoinSession);
  leaveSessionBtn.addEventListener('click', clientLeaveSession);

  togglePasswordBtn.addEventListener('click', () => {
    if (sessionPasswordField.type === 'password') {
      sessionPasswordField.type = 'text'; togglePasswordBtn.textContent = window.i18n.t('hide');
    } else { sessionPasswordField.type = 'password'; togglePasswordBtn.textContent = window.i18n.t('show') }
  });
});
