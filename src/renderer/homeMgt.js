document.addEventListener('DOMContentLoaded', () => {
  const shareObsControlBtn = document.getElementById('share-obs-control-btn');
  const controlObsBtn = document.getElementById('control-obs-btn');

  shareObsControlBtn.addEventListener('click', async () => {
    location.href = 'sessionHost.html'
  });

  controlObsBtn.addEventListener('click', async () => {
    location.href = 'sessionClient.html'
  });
});
