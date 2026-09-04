const { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");

const isDevelopment = !app.isPackaged;
const devServerUrl = "http://127.0.0.1:3000";
let mainWindow;
let nextServer;
let localServerUrl;
let isFirstLaunch = false;
let workspaceMenuState = { autoSave: true, autoCompile: true };
const onboardingWindowSize = { width: 1100, height: 800, minWidth: 960, minHeight: 700 };

function sendWorkspaceCommand(command) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("quire:menu-command", command);
  }
}

function zoomWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
}

function installApplicationMenu() {
  const template = [
    {
      label: "Quire",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        { label: "New File…", accelerator: "CommandOrControl+N", click: () => sendWorkspaceCommand({ type: "new-file" }) },
        { label: "Save All", accelerator: "CommandOrControl+S", click: () => sendWorkspaceCommand({ type: "save-all" }) },
        { type: "separator" },
        {
          label: "Auto Save",
          type: "checkbox",
          checked: workspaceMenuState.autoSave,
          click: (item) => sendWorkspaceCommand({ type: "set-auto-save", enabled: item.checked }),
        },
        {
          label: "Auto Compile",
          type: "checkbox",
          checked: workspaceMenuState.autoCompile,
          click: (item) => sendWorkspaceCommand({ type: "set-auto-compile", enabled: item.checked }),
        },
        { type: "separator" },
        { label: "Recompile", accelerator: "CommandOrControl+Enter", click: () => sendWorkspaceCommand({ type: "recompile" }) },
        { label: "Export PDF…", accelerator: "CommandOrControl+Shift+E", click: () => sendWorkspaceCommand({ type: "export-pdf" }) },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle File Explorer", accelerator: "CommandOrControl+Shift+L", click: () => sendWorkspaceCommand({ type: "toggle-explorer" }) },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { label: "Zoom Window", click: zoomWindow },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "close" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function getWorkspacePreferencesPath() {
  return path.join(app.getPath("userData"), "workspace.json");
}

function getOnboardingPreferencesPath() {
  return path.join(app.getPath("userData"), "onboarding.json");
}

async function markFirstLaunchComplete() {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getOnboardingPreferencesPath(), JSON.stringify({ completedAt: Date.now() }, null, 2));
}

function getMacWorkspacePath() {
  if (process.env.QUIRE_WORKSPACE) return process.env.QUIRE_WORKSPACE;

  try {
    const preferences = JSON.parse(fsSync.readFileSync(getWorkspacePreferencesPath(), "utf8"));
    if (typeof preferences.workspacePath === "string" && path.isAbsolute(preferences.workspacePath)) {
      return preferences.workspacePath;
    }
  } catch {
    // The default location is used until a writer chooses a different folder.
  }

  return path.join(app.getPath("documents"), "Quire");
}

async function saveMacWorkspacePath(workspacePath) {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getWorkspacePreferencesPath(), JSON.stringify({ workspacePath }, null, 2));
}

function macPath() {
  return [
    "/Library/TeX/texbin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
    process.env.PATH,
  ].filter(Boolean).join(path.delimiter);
}

function bundledNodePath() {
  return [
    path.join(process.resourcesPath, "app.asar", "node_modules"),
    process.env.NODE_PATH,
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
      NODE_PATH: bundledNodePath(),
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
  const dimensions = isFirstLaunch
    // Deliberately between the original compact welcome window and the
    // former oversized setup frame. The workspace expands only after setup.
    ? onboardingWindowSize
    : { width: 1440, height: 960, minWidth: 980, minHeight: 680 };

  mainWindow = new BrowserWindow({
    ...dimensions,
    center: true,
    show: false,
    title: "Quire",
    backgroundColor: "#f4f4f1",
    titleBarStyle: "hiddenInset",
    maximizable: true,
    fullscreenable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (!isFirstLaunch) mainWindow?.maximize();
    mainWindow?.show();
    mainWindow?.webContents.send("quire:window-visible");
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).protocol === "https:") void shell.openExternal(url);
    } catch {
      // Keep malformed URLs inside the local app from opening anything.
    }
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

async function restartLocalServer() {
  if (nextServer && !nextServer.killed) nextServer.kill();
  nextServer = undefined;
  localServerUrl = await startLocalServer();

  if (mainWindow && !mainWindow.isDestroyed()) {
    await mainWindow.loadURL(`${localServerUrl}/app`);
  }
}

function expandToWorkspace() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setMinimumSize(980, 680);
  mainWindow.show();
  mainWindow.focus();
  if (!mainWindow.isMaximized()) mainWindow.maximize();
}

function enterOnboardingWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  mainWindow.setMinimumSize(onboardingWindowSize.minWidth, onboardingWindowSize.minHeight);
  mainWindow.setSize(onboardingWindowSize.width, onboardingWindowSize.height, true);
  mainWindow.center();
}

function setWindowAppearance(appearance) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setBackgroundColor(appearance === "dark" ? "#181818" : "#f4f4f1");
}

function getSafeProjectPath(projectId) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(projectId)) throw new Error("Quire could not find that project.");
  const workspacePath = path.resolve(getMacWorkspacePath());
  const projectPath = path.resolve(workspacePath, projectId);
  if (path.dirname(projectPath) !== workspacePath) throw new Error("Quire could not find that project.");
  return projectPath;
}

function getSafeProjectItemPath(projectId, itemPath) {
  if (typeof itemPath !== "string") throw new Error("Quire could not find that item.");
  const projectPath = getSafeProjectPath(projectId);
  const fullPath = path.resolve(projectPath, itemPath);
  const relativePath = path.relative(projectPath, fullPath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath) || relativePath.split(path.sep).some((part) => part.startsWith("."))) {
    throw new Error("Only visible project files can be moved to the Trash.");
  }

  return fullPath;
}

app.whenReady().then(async () => {
  isFirstLaunch = !fsSync.existsSync(getOnboardingPreferencesPath());
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));

  ipcMain.handle("quire:choose-workspace", async () => {
    if (isDevelopment) return { unavailable: true };

    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose your Quire workspace",
      defaultPath: getMacWorkspacePath(),
      buttonLabel: "Use this folder",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) return { cancelled: true };

    const workspacePath = result.filePaths[0];
    await saveMacWorkspacePath(workspacePath);
    await restartLocalServer();
    return { path: workspacePath };
  });

  ipcMain.handle("quire:complete-onboarding", async () => {
    await markFirstLaunchComplete();
    isFirstLaunch = false;
    expandToWorkspace();
  });

  ipcMain.handle("quire:get-launch-state", () => ({
    onboardingComplete: !isFirstLaunch,
  }));

  ipcMain.handle("quire:enter-onboarding", () => {
    enterOnboardingWindow();
  });

  ipcMain.handle("quire:set-window-appearance", (_event, appearance) => {
    if (appearance === "light" || appearance === "dark") setWindowAppearance(appearance);
  });

  ipcMain.on("quire:set-menu-state", (_event, state) => {
    if (typeof state?.autoSave === "boolean") workspaceMenuState.autoSave = state.autoSave;
    if (typeof state?.autoCompile === "boolean") workspaceMenuState.autoCompile = state.autoCompile;
    installApplicationMenu();
  });

  ipcMain.handle("quire:save-pdf", async (_event, input) => {
    const projectId = typeof input?.projectId === "string" ? input.projectId : "";
    if (!localServerUrl || !/^[a-z0-9][a-z0-9-]*$/i.test(projectId)) {
      throw new Error("Quire could not prepare this PDF for download.");
    }

    const requestedName = typeof input?.filename === "string" ? input.filename : "document.pdf";
    const filename = path.basename(requestedName).replace(/\.tex$/i, ".pdf");
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save PDF",
      defaultPath: path.join(app.getPath("downloads"), filename || "document.pdf"),
      filters: [{ name: "PDF document", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) return { cancelled: true };

    const response = await fetch(`${localServerUrl}/api/projects/${encodeURIComponent(projectId)}/pdf`);
    if (!response.ok) throw new Error("The latest PDF is not available yet. Compile the project and try again.");

    await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    return { cancelled: false, path: filePath };
  });

  ipcMain.handle("quire:trash-project-item", async (_event, input) => {
    const fullPath = getSafeProjectItemPath(input?.projectId, input?.path);
    await fs.access(fullPath);
    await shell.trashItem(fullPath);
    return { trashed: true };
  });

  ipcMain.handle("quire:trash-project", async (_event, input) => {
    const projectPath = getSafeProjectPath(input?.projectId);
    await fs.access(projectPath);
    await shell.trashItem(projectPath);
    return { trashed: true };
  });

  ipcMain.handle("quire:open-external-url", async (_event, input) => {
    if (typeof input?.url !== "string") throw new Error("Quire could not open that link.");
    const url = new URL(input.url);
    if (url.protocol !== "https:") throw new Error("Quire only opens secure web links externally.");
    await shell.openExternal(url.toString());
  });

  try {
    installApplicationMenu();
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
