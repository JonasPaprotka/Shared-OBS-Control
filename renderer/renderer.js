document.addEventListener('DOMContentLoaded', async () => {
  // titlebar rendering
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

  // version text
  const versionText = document.getElementById('version-text');
  const appVersion = 'v' + await window.electronAPI.getVersion();
  if (versionText) versionText.textContent = appVersion;

  // language
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

  // button mgt //TODO move shareObsControlBtn and controlObsBtn out of renderer.js
  const shareObsControlBtn = document.getElementById('share_obs_control_btn');
  if (shareObsControlBtn) shareObsControlBtn.addEventListener('click', () => { location.href = 'obs-share-control.html' });
  const controlObsBtn = document.getElementById('control_obs_btn');
  if (controlObsBtn) controlObsBtn.addEventListener('click', () => { location.href = 'obs-controller-login.html' });

  const navHomeBtn = document.getElementById('nav-home');
  if (navHomeBtn) navHomeBtn.addEventListener('click', () => {
    if (location.href.endsWith('index.html')) return;
    location.href = 'index.html'
  });
});
