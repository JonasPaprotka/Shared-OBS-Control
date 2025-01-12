// Status Text Colors
const failureStatusTextColor = 'text-red-500';
const sucessStatusTextColor = 'text-green-500';
const warningStatusTextColor = 'text-yellow-500';

// Connect Btn Colors
const greenConnectBtnColors = ['bg-green-600', 'hover:bg-green-700'];
const redConnectBtnColors = ['bg-red-600', 'hover:bg-red-700'];

async function log(div, message) {
  if (!div) return;

  const nearBottomThreshold = 10; // pixels
  const isNearBottom =
    div.scrollHeight - div.scrollTop - div.clientHeight < nearBottomThreshold;

  const time = new Date().toLocaleTimeString();
  const newRow = `<div class='selectable'>[${time}] ${message}</div>`;

  div.insertAdjacentHTML('beforeend', newRow);

  if (isNearBottom) {
    div.scrollTop = div.scrollHeight;
  }

  if (div.id && div.id.startsWith('host')) {
    await window.storage.add('host_logs', newRow);
  }

  if (div.id && div.id.startsWith('client')) {
    await window.storage.add('client_logs', newRow);
  }
}
