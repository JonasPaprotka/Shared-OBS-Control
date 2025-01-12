function log(divElement, message) {
  if (!divElement) return;
  const time = new Date().toLocaleTimeString();
  divElement.innerHTML += `<div class='selectable'>[${time}] ${message}</div>`;
  divElement.scrollTop = divElement.scrollHeight;
}
