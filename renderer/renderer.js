fetch('titlebar.html')
.then(response => response.text())
.then(html => {
  document.getElementById('titlebar-container').innerHTML = html;

  document.getElementById('minimize').addEventListener('click', () => {
    window.electronAPI.minimize();
  });

  document.getElementById('close').addEventListener('click', () => {
    window.electronAPI.close();
  });
})
.catch(error => console.error('Error loading title bar:', error));
