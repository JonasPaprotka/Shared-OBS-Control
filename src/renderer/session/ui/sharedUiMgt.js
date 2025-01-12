// Status Text Colors
const failureStatusTextColor = 'text-red-500';
const sucessStatusTextColor = 'text-green-500';
const warningStatusTextColor = 'text-yellow-500';

function log(divElement, message) {
  if (!divElement) return;
  const time = new Date().toLocaleTimeString();
  divElement.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
  divElement.scrollTop = divElement.scrollHeight;
}
