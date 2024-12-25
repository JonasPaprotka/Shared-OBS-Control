// titlebar rendering
fetch('titlebar.html')
  .then((response) => response.text())
  .then((html) => {
    document.getElementById('titlebar-container').innerHTML = html;

    const btnMinimize = document.getElementById('minimize');
    if (btnMinimize) {
      btnMinimize.addEventListener('click', () => {
        window.electronAPI.minimize();
      });
    }

    const btnClose = document.getElementById('close');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        window.electronAPI.close();
      });
    }
  })
  .catch((error) => console.error('Error loading title bar:', error));


// language
window.onload = async () => {
const detectedLocale = window.electronAPI.getDetectedLocale() || '';
const defaultLanguage = detectedLocale.trim() === '' ? 'en' : detectedLocale;
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
};
