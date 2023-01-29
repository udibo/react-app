const devPort = window.app.devPort ?? 9002;
const source = new EventSource(`http://localhost:${devPort}/live-reload`);
source.addEventListener("open", () => {
  console.log("Live reload: Waiting for change");
});
source.addEventListener("close", () => {
  console.log("Live reload: Stopped");
});
source.addEventListener("error", (event) => {
  console.log("Live reload: Error", event);
});
source.addEventListener("reload", () => {
  console.log("Live reload: Reloading");
  location.reload();
});

globalThis.addEventListener("beforeunload", () => source.close());
