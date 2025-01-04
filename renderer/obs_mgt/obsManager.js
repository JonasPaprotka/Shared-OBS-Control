const obsManager = {
  handleAction(action, payload) {
    switch (action) {
      case 'GetVersion':
        return { version: 'v0.1.0' }; //TODO find better solution

      case 'SwitchToScene':
        const sceneName = payload.sceneName;
        if (!sceneName) {
          return { error: 'Scene name is required' };
        }
        //TODO finish example
        return { message: `Switched to scene: ${sceneName}` };

      default:
        return { error: 'Unknown action' };
    }
  },
};

module.exports = { obsManager };
