document.addEventListener('DOMContentLoaded', async () => {
  // Titlebar rendering
  fetch('titlebar.html')
    .then((response) => response.text())
    .then((html) => {
      document.getElementById('titlebar-container').innerHTML = html;

      const btnMinimize = document.getElementById('minimize');
      if (btnMinimize) btnMinimize.addEventListener('click', () => { window.electronAPI.minimize() });

      const btnClose = document.getElementById('close');
      if (btnClose) btnClose.addEventListener('click', () => { window.electronAPI.close() });
    })
    .catch((error) => console.error('Error loading title bar:', error));

  // Version Text
  const versionText = document.getElementById('version-text');
  const appVersion = 'v' + await window.electronAPI.getVersion();
  if (versionText) versionText.textContent = appVersion;

  // Language
  let detectedLocale = window.electronAPI.getDetectedLocale() || '';
  let defaultLanguage = detectedLocale.trim() === '' ? 'en' : detectedLocale;
  defaultLanguage = defaultLanguage.toLowerCase();
  const elements = document.querySelectorAll('[data-lang]');

  for (const element of elements) {
    const key = element.getAttribute('data-lang');
    try {
      const translatedText = await window.electronAPI.translate(defaultLanguage, key);
      element.textContent = translatedText;
    } catch (err) {
      console.error(`Translation error for key "${key}" in language "${defaultLanguage}":`, err);
    }
  }

  // Home Btn pressed
  const navHomeBtn = document.getElementById('nav-home');
  if (navHomeBtn) navHomeBtn.addEventListener('click', async () => {

    // Pause session if running
    if (location.href.endsWith('sessionHost.html')) {
      if ((typeof hostPauseSession === 'function') && (ws)) {
        const dialogTitle = await window.i18n.t('pause_session_dialog_title');
        const dialogMessage = await window.i18n.t('pause_session_dialog_message');
        const dialogDetail = await window.i18n.t('pause_session_dialog_detail');
        const dialogButtons = [
          await window.i18n.t('pause_session_dialog_button_pause_session'),
          await window.i18n.t('pause_session_dialog_button_cancel')
        ];
        const dialogOpts = {
          type: 'info',
          title: dialogTitle,
          message: dialogMessage,
          detail: dialogDetail,
          buttons: dialogButtons,
          cancelId: 1
        };
        const returnValue = await window.dialogAPI.showMessageBox(dialogOpts);
        if (returnValue.response !== 0) return;
        hostPauseSession();
      }
    }

    // Go Home
    if (location.href.endsWith('index.html')) return;
    location.href = 'index.html'
  });
});
