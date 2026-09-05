const { app, BrowserWindow, dialog, ipcMain, Menu, safeStorage, session, shell } = require("electron");
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
const AI_PROVIDERS = {
  openai: { label: "OpenAI", defaultModel: "gpt-5-mini" },
  anthropic: { label: "Anthropic", defaultModel: "claude-sonnet-5" },
  openrouter: { label: "OpenRouter", defaultModel: "openrouter/free" },
};
const DEFAULT_AI_PROVIDER = "openrouter";

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
        { label: "New Folder…", accelerator: "CommandOrControl+Shift+N", click: () => sendWorkspaceCommand({ type: "new-folder" }) },
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
      // Electron only wires the native macOS editing shortcuts when the
      // corresponding edit roles are present in the application menu. Keep
      // these as native roles so Cmd-X/C/V/Z/A work in CodeMirror, dialogs,
      // and every other text field without bespoke clipboard code.
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" },
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

function getAiAssistantPreferencesPath() {
  return path.join(app.getPath("userData"), "ai-assistant.json");
}

function isAiProvider(provider) {
  return typeof provider === "string" && Object.hasOwn(AI_PROVIDERS, provider);
}

function normalizeAiProvider(provider, fallback = DEFAULT_AI_PROVIDER) {
  return isAiProvider(provider) ? provider : fallback;
}

function defaultAiModel(provider) {
  return AI_PROVIDERS[normalizeAiProvider(provider)].defaultModel;
}

function normalizeAiModel(model, provider) {
  if (typeof model !== "string") return defaultAiModel(provider);
  const trimmed = model.trim();
  return /^[a-zA-Z0-9._~:/-]{1,180}$/.test(trimmed) ? trimmed : defaultAiModel(provider);
}

function encryptedKeysFromPreferences(preferences) {
  const encryptedApiKeys = {};
  if (preferences?.encryptedApiKeys && typeof preferences.encryptedApiKeys === "object") {
    for (const provider of Object.keys(AI_PROVIDERS)) {
      if (typeof preferences.encryptedApiKeys[provider] === "string") {
        encryptedApiKeys[provider] = preferences.encryptedApiKeys[provider];
      }
    }
  }

  // AI Assistant originally supported OpenAI alone. Preserve an existing
  // local key as the user moves to the provider-neutral settings format.
  if (!encryptedApiKeys.openai && typeof preferences?.encryptedApiKey === "string") {
    encryptedApiKeys.openai = preferences.encryptedApiKey;
  }

  return encryptedApiKeys;
}

async function readAiAssistantPreferences() {
  try {
    const preferences = JSON.parse(await fs.readFile(getAiAssistantPreferencesPath(), "utf8"));
    const encryptedApiKeys = encryptedKeysFromPreferences(preferences);
    const hasLegacyOpenAiKey = Boolean(preferences?.encryptedApiKey && !preferences?.provider);
    const provider = normalizeAiProvider(preferences?.provider, hasLegacyOpenAiKey ? "openai" : DEFAULT_AI_PROVIDER);
    return {
      provider,
      model: normalizeAiModel(preferences?.model, provider),
      encryptedApiKeys,
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { provider: DEFAULT_AI_PROVIDER, model: defaultAiModel(DEFAULT_AI_PROVIDER), encryptedApiKeys: {} };
    throw new Error("Quire could not read the AI Assistant settings.");
  }
}

function getAiAssistantKey(preferences) {
  const encryptedApiKey = preferences.encryptedApiKeys[preferences.provider];
  const providerLabel = AI_PROVIDERS[preferences.provider].label;
  if (!encryptedApiKey) throw new Error(`Add your ${providerLabel} API key in Settings before using the AI Assistant.`);
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("macOS Keychain is not available, so Quire cannot securely use an AI API key.");
  }

  try {
    return safeStorage.decryptString(Buffer.from(encryptedApiKey, "base64"));
  } catch {
    throw new Error("Quire could not read your saved AI API key. Add it again in Settings.");
  }
}

function writingAssistantInstructions(mode) {
  const task = {
    improve: "Improve clarity, flow, and precision while preserving the writer's meaning and voice.",
    correct: "Correct grammar, punctuation, spelling, and clear language issues while preserving the writer's meaning and voice.",
    shorten: "Make the passage more concise while preserving its important meaning and voice.",
    explain: "Give concise editorial feedback about clarity, grammar, and structure. Do not rewrite the passage.",
  }[mode];

  if (!task) throw new Error("Choose a valid AI Assistant action.");

  return `You are Quire's writing assistant. ${task}

Follow these principles:
- Keep the writing recognizably human and specific to the writer; do not flatten it into generic prose.
- Create original wording from scratch. Do not imitate a named author or reproduce text from a source.
- Never claim to have checked plagiarism, AI detection, citations, or factual accuracy. You cannot verify any of those from this passage alone.
- Do not invent quotations, sources, facts, statistics, or citations.
- Do not help disguise copied work or evade academic-integrity or AI-detection systems.
- Work only with the passage the writer deliberately selected.

${mode === "explain"
  ? "Return short, practical feedback in bullets."
  : "Return only the complete revised passage. Do not add a preface, explanation, quotation marks, or Markdown."}`;
}

async function requestWritingAssistance({ selection, mode }) {
  if (typeof selection !== "string" || !selection.trim()) {
    throw new Error("Select the passage you want help with first.");
  }
  if (selection.length > 18000) {
    throw new Error("Select a shorter passage (up to 18,000 characters) for one AI request.");
  }

  const preferences = await readAiAssistantPreferences();
  const apiKey = getAiAssistantKey(preferences);
  const instructions = writingAssistantInstructions(mode);
  let response;
  let extractOutput;

  if (preferences.provider === "anthropic") {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: preferences.model,
        max_tokens: 900,
        system: instructions,
        messages: [{ role: "user", content: selection }],
      }),
    });
    extractOutput = (payload) => payload?.content
      ?.filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n");
  } else if (preferences.provider === "openrouter") {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: preferences.model,
        max_tokens: 900,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: selection },
        ],
      }),
    });
    extractOutput = (payload) => {
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) return content.filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n");
      return "";
    };
  } else {
    response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: preferences.model,
      store: false,
      max_output_tokens: 900,
      instructions,
      input: selection,
    }),
  });
    extractOutput = (payload) => payload?.output_text;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "The AI Assistant could not complete that request.");
  }

  const rawOutput = extractOutput(payload);
  const output = typeof rawOutput === "string" ? rawOutput.trim() : "";
  if (!output) throw new Error("The AI Assistant returned an empty response. Try again.");
  return { output };
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

  ipcMain.handle("quire:get-ai-settings", async (_event, input) => {
    const preferences = await readAiAssistantPreferences();
    const provider = normalizeAiProvider(input?.provider, preferences.provider);
    return {
      provider,
      providerLabel: AI_PROVIDERS[provider].label,
      model: provider === preferences.provider ? preferences.model : defaultAiModel(provider),
      keyConfigured: Boolean(preferences.encryptedApiKeys[provider]),
    };
  });

  ipcMain.handle("quire:save-ai-settings", async (_event, input) => {
    const current = await readAiAssistantPreferences();
    const provider = normalizeAiProvider(input?.provider, current.provider);
    const model = normalizeAiModel(input?.model, provider);
    const encryptedApiKeys = { ...current.encryptedApiKeys };

    if (input?.removeApiKey === true) {
      delete encryptedApiKeys[provider];
    } else if (typeof input?.apiKey === "string" && input.apiKey.trim()) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("macOS Keychain is not available, so Quire cannot securely save an AI API key.");
      }
      encryptedApiKeys[provider] = safeStorage.encryptString(input.apiKey.trim()).toString("base64");
    }

    await fs.mkdir(app.getPath("userData"), { recursive: true });
    await fs.writeFile(getAiAssistantPreferencesPath(), JSON.stringify({ provider, model, encryptedApiKeys }, null, 2));
    return {
      provider,
      providerLabel: AI_PROVIDERS[provider].label,
      model,
      keyConfigured: Boolean(encryptedApiKeys[provider]),
    };
  });

  ipcMain.handle("quire:assist-writing", async (_event, input) => requestWritingAssistance(input || {}));

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
