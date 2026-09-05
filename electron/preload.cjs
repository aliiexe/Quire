const { contextBridge, ipcRenderer } = require("electron");

let windowIsVisible = false;
const visibilityWaiters = [];

ipcRenderer.on("quire:window-visible", () => {
  windowIsVisible = true;
  visibilityWaiters.splice(0).forEach((resolve) => resolve());
});

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.quireDesktop = "true";
});

contextBridge.exposeInMainWorld("quireDesktop", {
  chooseWorkspace: () => ipcRenderer.invoke("quire:choose-workspace"),
  getLaunchState: () => ipcRenderer.invoke("quire:get-launch-state"),
  enterOnboarding: () => ipcRenderer.invoke("quire:enter-onboarding"),
  completeOnboarding: () => ipcRenderer.invoke("quire:complete-onboarding"),
  setWindowAppearance: (appearance) => ipcRenderer.invoke("quire:set-window-appearance", appearance),
  getAiSettings: (input) => ipcRenderer.invoke("quire:get-ai-settings", input),
  saveAiSettings: (input) => ipcRenderer.invoke("quire:save-ai-settings", input),
  listAiModels: (input) => ipcRenderer.invoke("quire:list-ai-models", input),
  assistWriting: (input) => ipcRenderer.invoke("quire:assist-writing", input),
  savePdf: (input) => ipcRenderer.invoke("quire:save-pdf", input),
  trashProjectItem: (input) => ipcRenderer.invoke("quire:trash-project-item", input),
  trashProject: (input) => ipcRenderer.invoke("quire:trash-project", input),
  openExternalUrl: (input) => ipcRenderer.invoke("quire:open-external-url", input),
  setMenuState: (state) => ipcRenderer.send("quire:set-menu-state", state),
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("quire:menu-command", listener);
    return () => ipcRenderer.removeListener("quire:menu-command", listener);
  },
  whenWindowVisible: () => {
    if (windowIsVisible) return Promise.resolve();
    return new Promise((resolve) => visibilityWaiters.push(resolve));
  },
});
