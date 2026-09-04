const { app, BrowserWindow, dialog, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs/promises");

const isDevelopment = !app.isPackaged;
const devServerUrl = "http://127.0.0.1:3000";
let mainWindow;
let nextServer;
let localServerUrl;

function getMacWorkspacePath() {
  return process.env.QUIRE_WORKSPACE || path.join(app.getPath("documents"), "Quire");
}

function macPath() {
  return [
    "/Library/TeX/texbin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
    process.env.PATH,
  ].filter(Boolean).join(path.delimiter);
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    let remaining = attempts;

    const tryRequest = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.once("error", retry);
      request.setTimeout(500, () => request.destroy());
    };

    const retry = () => {
      remaining -= 1;
      if (remaining <= 0) {
        reject(new Error("The bundled Quire server did not start."));
        return;
      }
      setTimeout(tryRequest, 125);
    };

    tryRequest();
  });
}

async function startLocalServer() {
  if (isDevelopment) return devServerUrl;

  const port = await findAvailablePort();
  const runtimePath = path.join(process.resourcesPath, "next");
  const serverPath = path.join(runtimePath, "server.js");
  const workspacePath = getMacWorkspacePath();

  await fs.mkdir(workspacePath, { recursive: true });

  nextServer = spawn(process.execPath, [serverPath], {
    cwd: runtimePath,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      PATH: macPath(),
      QUIRE_WORKSPACE: workspacePath,
    },
    stdio: "ignore",
  });

  nextServer.unref();
  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 980,
    minHeight: 680,
    show: false,
    title: "Quire",
    backgroundColor: "#1c1817",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://github.com/")) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (localServerUrl && !url.startsWith(localServerUrl)) event.preventDefault();
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  return mainWindow.loadURL(`${localServerUrl}/app`);
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  try {
    localServerUrl = await startLocalServer();
    await createWindow();
  } catch (error) {
    dialog.showErrorBox("Quire could not start", error instanceof Error ? error.message : String(error));
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && localServerUrl) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextServer && !nextServer.killed) nextServer.kill();
});
