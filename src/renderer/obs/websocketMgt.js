// Connect Btn Colors
const greenConnectBtnColors = ['bg-green-600', 'hover:bg-green-700'];
const redConnectBtnColors = ['bg-red-600', 'hover:bg-red-700'];


document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  const hostLogs = document.getElementById('host-logs');
  const connectBtn = document.getElementById('connect-obs-websocket-btn');
  const disconnectBtn = document.getElementById('disconnect-obs-websocket-btn');
  const obsPasswordInput = document.getElementById('obs-websocket-password');
  const obsStatusText = document.getElementById('obs-status-text');

  function logHost(message) {
    if (!hostLogs) return;
    const time = new Date().toLocaleTimeString();
    hostLogs.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
    hostLogs.scrollTop = hostLogs.scrollHeight;
  }

  obsStatusText.textContent = window.i18n.t('not_connected_to_obs');
  obsStatusText.classList.add(warningStatusTextColor);

  obsPasswordInput.addEventListener('input', () => {
    if (obsPasswordInput.value.trim() === '') {
      connectBtn.classList.remove(...greenConnectBtnColors);
      connectBtn.classList.add(...redConnectBtnColors);
    } else {
      connectBtn.classList.remove(...redConnectBtnColors);
      connectBtn.classList.add(...greenConnectBtnColors);
    }
  });

  disconnectBtn.addEventListener('click', async () => {
    const result = await window.obsAPI.disconnect();
    logHost(result.message);

    if (!result || !result.success) {
      obsStatusText.textContent = window.i18n.t('failed_to_disconnect_from_obs_websocket');
      obsStatusText.classList.add(failureStatusTextColor);
      obsStatusText.classList.remove(sucessStatusTextColor, warningStatusTextColor);
      return;
    }

    obsStatusText.textContent = window.i18n.t('not_connected_to_obs');
    obsStatusText.classList.add(warningStatusTextColor);
    disconnectBtn.classList.add('hidden');
    connectBtn.classList.remove('hidden');
  });

  connectBtn.addEventListener('click', async () => {
    const password = obsPasswordInput.value.trim();

    if (password === '') {
      obsStatusText.textContent = window.i18n.t('password_required');
      obsStatusText.classList.add(failureStatusTextColor);
      obsStatusText.classList.remove(sucessStatusTextColor, warningStatusTextColor);
      return;
    }

    connectBtn.classList.add('hidden');
    disconnectBtn.classList.remove('hidden');

    try {
      const result = await window.obsAPI.connect(password);
      logHost(result.message);

      //TODO Rework Connection-Status
      if (!result || !result.success) {
        obsStatusText.textContent = window.i18n.t('failed_to_connect_to_obs_websocket');
        obsStatusText.classList.add(failureStatusTextColor);
        obsStatusText.classList.remove(sucessStatusTextColor, warningStatusTextColor);
        return;
      }

      obsStatusText.textContent = window.i18n.t('connected_to_obs_websocket');
      obsStatusText.classList.add(sucessStatusTextColor);
      obsStatusText.classList.remove(failureStatusTextColor, warningStatusTextColor);

      //TODO Relevant Events --> Server --> Connected Clients
      window.obsAPI.onEvent('CurrentProgramSceneChanged', (data) => {
        console.log('Switched scenes to:', data.sceneName);
        if (window.hostWS && window.hostWS.readyState === WebSocket.OPEN) {
          window.hostWS.send(
            JSON.stringify({
              type: 'event',
              eventName: 'SceneSwitched',
              payload: {
                sceneName: data.sceneName,
              },
            })
          );
        } else {
          console.log('No open connection to broadcast this event');
        }
      });
    } catch (error) {
      obsStatusText.textContent = window.i18n.t('error_connecting_to_obs_websocket');
      obsStatusText.classList.add(failureStatusTextColor);
      obsStatusText.classList.remove(sucessStatusTextColor, warningStatusTextColor);
      console.error('Error connecting to OBS:', error);

      disconnectBtn.classList.add('hidden');
      connectBtn.classList.remove('hidden');
    }
  });
});
