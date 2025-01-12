document.addEventListener('DOMContentLoaded', () => {
  // Share OBS Control
  const shareObsControlBtn = document.getElementById('share_obs_control_btn');
  shareObsControlBtn.addEventListener('click', async () => {
    location.href = 'obs-share-control.html'
  });

  // Control OBS
  const controlObsBtn = document.getElementById('control_obs_btn');
  controlObsBtn.addEventListener('click', async () => {
    location.href = 'obs-controller-login.html'
  });
});