// Status Text Colors
const failureStatusTextColor = 'text-red-500';
const sucessStatusTextColor = 'text-green-500';
const warningStatusTextColor = 'text-yellow-500';

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
