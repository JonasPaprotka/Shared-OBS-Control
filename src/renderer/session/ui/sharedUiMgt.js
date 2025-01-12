// Status Text Colors
const failureStatusTextColor = 'text-red-500';
const sucessStatusTextColor = 'text-green-500';
const warningStatusTextColor = 'text-yellow-500';

// Connect Btn Colors
const greenConnectBtnColors = ['bg-green-600', 'hover:bg-green-700'];
const redConnectBtnColors = ['bg-red-600', 'hover:bg-red-700'];

async function log(div, message) {
  if (!div) return;

  const time = new Date().toLocaleTimeString();
  const newRow = `<div class='selectable'>[${time}] ${message}</div>`;
  div.innerHTML += newRow;
  div.scrollTop = div.scrollHeight;

  if (div.id && div.id.startsWith('host')) {
    await window.storage.add('host_logs', newRow);
  }
}
