document.addEventListener('DOMContentLoaded', () => {
  const shareObsControlBtn = document.getElementById('share_obs_control_btn');
  if (shareObsControlBtn) shareObsControlBtn.addEventListener('click', () => { location.href = 'obs-share-control.html' });

  const controlObsBtn = document.getElementById('control_obs_btn');
  if (controlObsBtn) controlObsBtn.addEventListener('click', () => { location.href = 'obs-controller-login.html' });
});