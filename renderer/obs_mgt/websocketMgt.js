document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connect-obs-websocket-btn');
    const obsPasswordInput = document.getElementById('obs-websocket-password');

    connectBtn.addEventListener('click', async () => {
      const password = obsPasswordInput.value.trim();
      if (password === '') {
        alert('Password cannot be empty.');
        return;
      }

      const result = await window.obsAPI.connect(password);
      alert(result.message);

      if (result.success) {
        window.obsAPI.onEvent('CurrentProgramSceneChanged', (data) => {
          console.log('Switched scenes to:', data.sceneName);
        });
      }
    });
  });
