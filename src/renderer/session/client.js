let sessionToken = null;
let sessionPassword = null;
let sessionId = null;
let clientId = null;
let ws = null;

document.addEventListener('DOMContentLoaded', async () => {
  const loadedValues = await loadClientSessionData();
  if (loadedValues) {
    await inputClientSessionData(loadedValues);
  }
});
