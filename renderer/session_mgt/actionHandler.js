function sendAction(action, payload = {}) {
  if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
    console.error('WebSocket is not open');
    return;
  }

  const message = {
    type: 'request',
    action,
    payload,
  };

  window.ws.send(JSON.stringify(message));
}

function handleActionMessage(data, handlers = {}) {
  if (!data.type) return;

  switch (data.type) {
    case 'response':
      if (handlers.onResponse) handlers.onResponse(data.action, data.payload);
      break;
    case 'error':
      if (handlers.onError) handlers.onError(data.error || data.message);
      break;
    case 'action':
      if (handlers.onAction) handlers.onAction(data.action, data.payload);
      break;
    default:
      console.warn(`Unknown message type: ${data.type}`);
  }
}

module.exports = {
  sendAction,
  handleActionMessage,
};
