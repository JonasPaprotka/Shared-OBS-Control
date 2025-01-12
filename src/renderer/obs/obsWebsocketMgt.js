function toggleObsWebsocketConnectionButton() {
  connectObsWebsocketBtn.classList.toggle('hidden');
  disconnectObsWebsocketBtn.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.load();

  obsWebsocketPasswordField.addEventListener('input', () => {
    if (obsWebsocketPasswordField.value.trim() === '') {
      connectObsWebsocketBtn.classList.remove(...greenConnectBtnColors);
      connectObsWebsocketBtn.classList.add(...redConnectBtnColors);
    } else {
      connectObsWebsocketBtn.classList.remove(...redConnectBtnColors);
      connectObsWebsocketBtn.classList.add(...greenConnectBtnColors);
    }
  });

  disconnectObsWebsocketBtn.addEventListener('click', async () => {
    const result = await window.obsAPI.disconnect();
    log(hostLogsDiv, result.message);

    if (!result || !result.success) {
      setObsWebsocketStatus(await window.i18n.t('failed_to_disconnect_from_obs_websocket'), failureStatusTextColor);
      return;
    }
    setObsWebsocketStatus(await window.i18n.t('not_connected_to_obs'), warningStatusTextColor);
    toggleObsWebsocketConnectionButton();
  });

  connectObsWebsocketBtn.addEventListener('click', async () => {
    const password = obsWebsocketPasswordField.value.trim();

    if (password === '') {
      setObsWebsocketStatus(await window.i18n.t('password_required'), failureStatusTextColor);
      return;
    }

    try {
      const result = await window.obsAPI.connect(password);
      log(hostLogsDiv, result.message);

      if (!result || !result.success) {
        setObsWebsocketStatus(await window.i18n.t('failed_to_connect_to_obs_websocket'), failureStatusTextColor);
        return;
      }
      setObsWebsocketStatus(await window.i18n.t('connected_to_obs_websocket'), sucessStatusTextColor);
      toggleObsWebsocketConnectionButton();
      await window.storage.set('obsWebsocket_password', password);

      //TODO Subs. to all relevant events
      window.obsAPI.onEvent('CurrentProgramSceneChanged', (data) => {
        if (window.hostWS && window.hostWS.readyState === WebSocket.OPEN) {
          window.hostWS.send(
            JSON.stringify({
              type: 'event',
              eventName: 'SceneSwitched',
              payload: { sceneName: data.sceneName }
            })
          );
        } else {
          console.warn('Cant send event');
        }
      });
    } catch (error) {
      console.error('Error connecting to OBS:', error);
      setObsWebsocketStatus(await window.i18n.t('error_connecting_to_obs_websocket'), failureStatusTextColor);

      toggleObsWebsocketConnectionButton();
    }
  });
});
