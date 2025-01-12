let obsReference = null;

function init(obsInstance) {
  obsReference = obsInstance;
}

async function handleAction(action, payload) {
  switch (action) {
    case 'GetVersion':
      return await handleGetVersion();

    case 'SwitchToScene':
      return await handleSwitchToScene(payload);

    default:
      return { error: `Unknown action: ${action}` };
  }
}

async function handleGetVersion() {
  if (!obsReference) {
    return { error: 'Not connected to OBS' };
  }
  try {
    const versionInfo = await obsReference.call('GetVersion');
    return {
      obsWebSocketVersion: versionInfo.obsWebSocketVersion,
      obsVersion: versionInfo.obsVersion,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleSwitchToScene(payload) {
  if (!obsReference) {
    return { error: 'Not connected to OBS' };
  }
  if (!payload.sceneName) {
    return { error: 'sceneName is required' };
  }

  try {
    await obsReference.call('SetCurrentProgramScene', {
      sceneName: payload.sceneName,
    });
    return { message: `Switched to scene: ${payload.sceneName}` };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  obsHostHandler: {
    init,
    handleAction,
  }
};
