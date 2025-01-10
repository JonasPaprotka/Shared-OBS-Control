document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  const connectBtn = document.getElementById('connect-obs-websocket-btn');
  const obsPasswordInput = document.getElementById('obs-websocket-password');
  const obsStatusText = document.getElementById('obs-status-text');

  if (obsStatusText) {
    obsStatusText.textContent = window.i18n.t('not_connected_to_obs');
    obsStatusText.classList.add('text-yellow-500');
  }

  if (obsPasswordInput) {
    obsPasswordInput.addEventListener('input', () => {
      if (connectBtn) {
        if (obsPasswordInput.value.trim() === '') {
          connectBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
          connectBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
          connectBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
          connectBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        }
      }
    });
  }

  connectBtn.addEventListener('click', async () => {
    const password = obsPasswordInput.value.trim();

    if (password === '') {
      if (obsStatusText) {
        obsStatusText.textContent = window.i18n.t('password_required');
        obsStatusText.classList.add('text-red-500');
        obsStatusText.classList.remove('text-green-500', 'text-yellow-500');
      }
      return;
    }

    try {
      const result = await window.obsAPI.connect(password);

      //TODO Rework Connection-Status
      if (!result || !result.success) {
        if (obsStatusText) {
          obsStatusText.textContent = window.i18n.t('failed_to_connect_to_obs');
          obsStatusText.classList.add('text-red-500');
          obsStatusText.classList.remove('text-green-500', 'text-yellow-500');
        }
        console.error('Connection failed:', result?.error || 'Unknown error');
        return;
      }

      if (obsStatusText) {
        obsStatusText.textContent = window.i18n.t('connected_to_obs');
        obsStatusText.classList.add('text-green-500');
        obsStatusText.classList.remove('text-red-500', 'text-yellow-500');
      }

      //TODO Relevant Events --> Server --> Connected Clients
      window.obsAPI.onEvent('CurrentProgramSceneChanged', (data) => {
        console.log('Switched scenes to:', data.sceneName);
      });
    } catch (error) {
      if (obsStatusText) {
        obsStatusText.textContent = window.i18n.t('error_connecting_to_obs');
        obsStatusText.classList.add('text-red-500');
        obsStatusText.classList.remove('text-green-500', 'text-yellow-500');
      }
      console.error('Error connecting to OBS:', error);
    }
  });
});
