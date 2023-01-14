const devPort = window.app.devPort ?? 9002;
const ws = new WebSocket(`ws://localhost:${devPort}/live-reload`);
ws.onopen = () => {
  console.log("Live reload: Waiting for change");
};
ws.onclose = () => {
  console.log("Live reload: Stopped");
};
ws.onmessage = (message) => {
  const data = JSON.parse(message.data);
  const { command } = data;
  if (command === "reload") {
    console.log("Live reload: Reloading");
    location.reload();
  }
};
ws.onerror = (event) => {
  console.log("Live reload: Error", event);
};
