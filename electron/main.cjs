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
  openrouter: { label: "OpenRouter", defaultModel: "z-ai/glm-5.2:free", protocol: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1" },
  openai: { label: "OpenAI", defaultModel: "gpt-5-mini", protocol: "openai" },
  anthropic: { label: "Anthropic (Claude)", defaultModel: "claude-sonnet-5", protocol: "anthropic" },
  google: { label: "Google Gemini", defaultModel: "gemini-3.7-flash", protocol: "gemini" },
  groq: { label: "Groq", defaultModel: "openai/gpt-oss-120b", protocol: "openai-compatible", baseUrl: "https://api.groq.com/openai/v1" },
  deepseek: { label: "DeepSeek", defaultModel: "deepseek-v4-flash", protocol: "openai-compatible", baseUrl: "https://api.deepseek.com" },
  mistral: { label: "Mistral AI", defaultModel: "", protocol: "openai-compatible", baseUrl: "https://api.mistral.ai/v1" },
  xai: { label: "xAI", defaultModel: "", protocol: "openai-compatible", baseUrl: "https://api.x.ai/v1" },
  cohere: { label: "Cohere", defaultModel: "command-a-03-2025", protocol: "cohere" },
  perplexity: { label: "Perplexity", defaultModel: "sonar", protocol: "perplexity" },
  together: { label: "Together AI", defaultModel: "", protocol: "openai-compatible", baseUrl: "https://api.together.xyz/v1" },
  fireworks: { label: "Fireworks AI", defaultModel: "", protocol: "openai-compatible", baseUrl: "https://api.fireworks.ai/inference/v1" },
  cerebras: { label: "Cerebras", defaultModel: "", protocol: "openai-compatible", baseUrl: "https://api.cerebras.ai/v1" },
  sambanova: { label: "SambaNova", defaultModel: "", protocol: "openai-compatible", baseUrl: "https://api.sambanova.ai/v1" },
  custom: { label: "Custom OpenAI-compatible API", defaultModel: "", protocol: "openai-compatible" },
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
  // Retire the rotating OpenRouter "free" route in favor of a model the user
  // can identify and deliberately select in Quire Draft.
  if (provider === "openrouter" && trimmed === "openrouter/free") return defaultAiModel(provider);
  return trimmed && /^[a-zA-Z0-9._~:/-]{1,180}$/.test(trimmed) ? trimmed : defaultAiModel(provider);
}

function normalizeCustomAiEndpoint(endpoint) {
  if (typeof endpoint !== "string" || !endpoint.trim()) return "";
  try {
    const url = new URL(endpoint.trim());
    if (url.protocol !== "https:") return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function aiProviderBaseUrl(preferences) {
  const provider = AI_PROVIDERS[preferences.provider];
  if (preferences.provider === "custom") {
    const customEndpoint = normalizeCustomAiEndpoint(preferences.customEndpoint);
    if (!customEndpoint) throw new Error("Add a secure OpenAI-compatible API base URL in Settings before using this provider.");
    return customEndpoint;
  }
  return provider.baseUrl || "";
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

  // Quire Draft originally supported OpenAI alone. Preserve an existing
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
      customEndpoint: normalizeCustomAiEndpoint(preferences?.customEndpoint),
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { provider: DEFAULT_AI_PROVIDER, model: defaultAiModel(DEFAULT_AI_PROVIDER), encryptedApiKeys: {}, customEndpoint: "" };
    throw new Error("Quire could not read the Quire Draft settings.");
  }
}

function getAiAssistantKey(preferences) {
  const encryptedApiKey = preferences.encryptedApiKeys[preferences.provider];
  const providerLabel = AI_PROVIDERS[preferences.provider].label;
  if (!encryptedApiKey) throw new Error(`Add your ${providerLabel} API key in Settings before using Quire Draft.`);
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Secure system credential storage is not available, so Quire cannot securely use an AI API key.");
  }

  try {
    return safeStorage.decryptString(Buffer.from(encryptedApiKey, "base64"));
  } catch {
    throw new Error("Quire could not read your saved AI API key. Add it again in Settings.");
  }
}

function writingAssistantInstructions(mode, additionalInstruction = "") {
  const task = {
    improve: "Improve clarity, flow, and precision while preserving the writer's meaning and voice.",
    correct: "Correct grammar, punctuation, spelling, and clear language issues while preserving the writer's meaning and voice.",
    shorten: "Make the passage more concise while preserving its important meaning and voice.",
    explain: "Give concise editorial feedback about clarity, grammar, and structure. Do not rewrite the passage.",
    custom: "Carry out the writer's exact requested revision of the selected passage while preserving the parts they did not ask to change.",
    draft: "Create a complete, compile-ready LaTeX document from the writer's brief. Use the document type the writer asks for, or a conventional article when they do not specify one.",
  }[mode];

  if (!task) throw new Error("Choose a valid Quire Draft action.");
  const writerDirection = additionalInstruction
    ? `\n\nThe writer also added this direction. Follow it when it does not conflict with the principles above: ${additionalInstruction}`
    : "";

  if (mode === "draft") {
    return `You are Quire Draft, a careful writing partner inside a local LaTeX editor. ${task}

Follow these principles:
- Build original writing from the brief. Do not imitate a named author or reproduce text from a source.
- Do not invent quotations, sources, citations, data, statistics, or factual claims. When a brief needs evidence, use clearly marked placeholders instead.
- Do not help disguise copied work or evade academic-integrity or AI-detection systems.
- Keep the document useful, specific, and recognizably human rather than generic.
- Work only from the writer's deliberate brief.

Return only complete LaTeX source, beginning with \\documentclass and ending with \\end{document}. Do not add Markdown fences, a preface, or explanation.${writerDirection}`;
  }

  return `You are Quire Draft, a careful writing partner inside a local LaTeX editor. ${task}

Follow these principles:
- Keep the writing recognizably human and specific to the writer; do not flatten it into generic prose.
- Create original wording from scratch. Do not imitate a named author or reproduce text from a source.
- Never claim to have checked plagiarism, AI detection, citations, or factual accuracy. You cannot verify any of those from this passage alone.
- Do not invent quotations, sources, facts, statistics, or citations.
- Do not help disguise copied work or evade academic-integrity or AI-detection systems.
- Work only with the passage the writer deliberately selected.

${mode === "explain"
  ? "Return short, practical feedback in bullets."
  : "Return only the complete revised passage. Do not add a preface, explanation, quotation marks, or Markdown."}${writerDirection}`;
}

function extractChatCompletionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n");
  return "";
}

function normalizeModelCatalog(entries) {
  if (!Array.isArray(entries)) return [];
  const unique = new Map();
  for (const entry of entries) {
    const rawId = typeof entry === "string" ? entry : entry?.id || entry?.name;
    const id = typeof rawId === "string" ? rawId.replace(/^models\//, "").trim() : "";
    if (!id || !/^[a-zA-Z0-9._~:/-]{1,180}$/.test(id)) continue;
    const displayName = typeof entry === "object" && typeof entry?.display_name === "string"
      ? entry.display_name
      : typeof entry === "object" && typeof entry?.displayName === "string"
        ? entry.displayName
        : id;
    unique.set(id, { id, label: displayName === id ? id : `${displayName} — ${id}` });
  }
  return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label)).slice(0, 100);
}

async function listAiModels({ provider: requestedProvider, apiKey: suppliedApiKey, customEndpoint }) {
  const saved = await readAiAssistantPreferences();
  const provider = normalizeAiProvider(requestedProvider, saved.provider);
  const preferences = {
    ...saved,
    provider,
    customEndpoint: normalizeCustomAiEndpoint(customEndpoint) || saved.customEndpoint,
  };
  const apiKey = typeof suppliedApiKey === "string" && suppliedApiKey.trim()
    ? suppliedApiKey.trim()
    : getAiAssistantKey(preferences);
  const definition = AI_PROVIDERS[provider];
  let response;

  if (definition.protocol === "anthropic") {
    response = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
  } else if (definition.protocol === "gemini") {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  } else if (definition.protocol === "cohere") {
    response = await fetch("https://api.cohere.com/v2/models", { headers: { Authorization: `Bearer ${apiKey}` } });
  } else if (definition.protocol === "perplexity") {
    response = await fetch("https://api.perplexity.ai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
  } else if (definition.protocol === "openai") {
    response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
  } else {
    response = await fetch(`${aiProviderBaseUrl(preferences)}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `Could not load models from ${definition.label}.`);
  return { models: normalizeModelCatalog(payload?.data || payload?.models) };
}

async function requestWritingAssistance({ selection, mode, instruction }) {
  if (typeof selection !== "string" || !selection.trim()) {
    throw new Error(mode === "draft" ? "Describe the document you want Quire Draft to create." : "Select the passage you want help with first.");
  }
  if (selection.length > 18000) {
    throw new Error("Select a shorter passage (up to 18,000 characters) for one AI request.");
  }
  if (typeof instruction !== "undefined" && (typeof instruction !== "string" || instruction.trim().length > 2000)) {
    throw new Error("Keep your additional direction under 2,000 characters.");
  }
  if (mode === "custom" && (!instruction || !instruction.trim())) {
    throw new Error("Write your request first, then Quire Draft can follow it.");
  }

  const preferences = await readAiAssistantPreferences();
  if (!preferences.model) throw new Error("Choose a model in Settings before using Quire Draft.");
  const apiKey = getAiAssistantKey(preferences);
  const instructions = writingAssistantInstructions(mode, typeof instruction === "string" ? instruction.trim() : "");
  const provider = AI_PROVIDERS[preferences.provider];
  const maxOutputTokens = mode === "draft" ? 4000 : 900;
  let response;
  let extractOutput;

  if (provider.protocol === "anthropic") {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: preferences.model,
        max_tokens: maxOutputTokens,
        system: instructions,
        messages: [{ role: "user", content: selection }],
      }),
    });
    extractOutput = (payload) => payload?.content
      ?.filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n");
  } else if (provider.protocol === "gemini") {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(preferences.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: "user", parts: [{ text: selection }] }],
        generationConfig: { maxOutputTokens },
      }),
    });
    extractOutput = (payload) => payload?.candidates?.[0]?.content?.parts
      ?.filter((part) => typeof part?.text === "string")
      .map((part) => part.text)
      .join("\n");
  } else if (provider.protocol === "cohere") {
    response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: preferences.model,
        max_tokens: maxOutputTokens,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: selection },
        ],
      }),
    });
    extractOutput = (payload) => {
      const content = payload?.message?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) return content.filter((part) => typeof part?.text === "string").map((part) => part.text).join("\n");
      return "";
    };
  } else if (provider.protocol === "perplexity") {
    response = await fetch("https://api.perplexity.ai/v1/sonar", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: preferences.model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: selection },
        ],
      }),
    });
    extractOutput = extractChatCompletionText;
  } else if (provider.protocol === "openai") {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: preferences.model,
        store: false,
        max_output_tokens: maxOutputTokens,
        instructions,
        input: selection,
      }),
    });
    extractOutput = (payload) => payload?.output_text;
  } else {
    response = await fetch(`${aiProviderBaseUrl(preferences)}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: preferences.model,
        max_tokens: maxOutputTokens,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: selection },
        ],
      }),
    });
    extractOutput = extractChatCompletionText;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerDetail = payload?.error?.message || payload?.message || payload?.error?.error?.message;
    throw new Error(providerDetail || `${provider.label} rejected this request (HTTP ${response.status}). Check the API key, selected model, and provider account, then try again.`);
  }

  const rawOutput = extractOutput(payload);
  const output = typeof rawOutput === "string" ? rawOutput.trim() : "";
  if (!output) throw new Error("Quire Draft returned an empty response. Try again.");
  return { output };
}

async function markFirstLaunchComplete() {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getOnboardingPreferencesPath(), JSON.stringify({ completedAt: Date.now() }, null, 2));
}

function getWorkspacePath() {
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

async function saveWorkspacePath(workspacePath) {
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(getWorkspacePreferencesPath(), JSON.stringify({ workspacePath }, null, 2));
}

function windowsLatexPaths() {
  if (process.platform !== "win32") return [];

  const programFiles = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);
  const candidates = [];
  const addMiKTeXRoot = (root) => {
    if (!root) return;
    candidates.push(
      path.join(root, "miktex", "bin", "x64"),
      path.join(root, "miktex", "bin"),
      path.join(root, "bin", "x64"),
      path.join(root, "bin"),
    );
  };

  // MiKTeX has used both a versioned directory ("MiKTeX 2.9") and an
  // unversioned one. Do not depend on the installer having updated PATH:
  // Quire should recognise a just-installed distribution immediately.
  const installationParents = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs"),
    process.env.APPDATA,
    process.env.ProgramData,
    ...programFiles,
  ].filter(Boolean);

  for (const parent of installationParents) {
    try {
      for (const entry of fsSync.readdirSync(parent, { withFileTypes: true })) {
        if (entry.isDirectory() && /^miktex(?:\s|$)/i.test(entry.name)) {
          addMiKTeXRoot(path.join(parent, entry.name));
        }
      }
    } catch {
      // An installation location may not exist on this computer.
    }
  }

  // Cover the paths used by current user and portable installations too.
  addMiKTeXRoot(process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs", "MiKTeX"));
  addMiKTeXRoot(process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "MiKTeX"));
  addMiKTeXRoot(process.env.APPDATA && path.join(process.env.APPDATA, "MiKTeX"));
  addMiKTeXRoot(process.env.ProgramData && path.join(process.env.ProgramData, "MiKTeX"));

  // TeX Live installs each release in a versioned folder. Discover installed
  // releases rather than hard-coding a particular year.
  try {
    for (const version of fsSync.readdirSync("C:\\texlive", { withFileTypes: true })) {
      if (version.isDirectory()) candidates.push(path.join("C:\\texlive", version.name, "bin", "windows"));
    }
  } catch {
    // TeX Live is optional; the normal PATH check below still applies.
  }

  return [...new Set(candidates.filter(Boolean))];
}

function latexPath() {
  const systemPath = process.platform === "win32" ? process.env.Path || process.env.PATH : process.env.PATH;
  const platformPaths = process.platform === "darwin"
    ? ["/Library/TeX/texbin", "/opt/homebrew/bin", "/usr/local/bin"]
    : windowsLatexPaths();
  return [...platformPaths, systemPath].filter(Boolean).join(path.delimiter);
}

function latexmkCommand() {
  const executable = process.platform === "win32" ? "latexmk.exe" : "latexmk";
  for (const directory of latexPath().split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, executable);
    try {
      if (fsSync.statSync(candidate).isFile()) return candidate;
    } catch {
      // Continue looking through the remaining TeX locations.
    }
  }
  return executable;
}

function latexEnvironment() {
  const compilerPath = latexPath();
  return {
    ...process.env,
    // Windows preserves the original casing of Path. Set both spellings so
    // Electron, Node and the MiKTeX child all receive the same search path.
    PATH: compilerPath,
    Path: compilerPath,
    QUIRE_LATEX_PATH: compilerPath,
    QUIRE_LATEXMK_COMMAND: latexmkCommand(),
  };
}

function getCompilerStatus() {
  return new Promise((resolve) => {
    let complete = false;
    const finish = (status) => {
      if (complete) return;
      complete = true;
      resolve(status);
    };
    let output = "";
    let child;

    try {
      child = spawn(latexmkCommand(), ["-v"], {
        env: latexEnvironment(),
        windowsHide: true,
      });
    } catch {
      finish({ platform: process.platform, latexmkAvailable: false });
      return;
    }

    const timeout = setTimeout(() => {
      child.kill();
      finish({ platform: process.platform, latexmkAvailable: false });
    }, 5000);

    child.stdout?.on("data", (data) => { output += data.toString(); });
    child.stderr?.on("data", (data) => { output += data.toString(); });
    child.once("error", () => {
      clearTimeout(timeout);
      finish({ platform: process.platform, latexmkAvailable: false });
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      finish({
        platform: process.platform,
        latexmkAvailable: code === 0,
        version: code === 0 ? output.split(/\r?\n/).find((line) => /latexmk/i.test(line))?.trim() || "latexmk" : undefined,
        installerName: process.platform === "win32" ? "MiKTeX" : undefined,
        installerUrl: process.platform === "win32" ? "https://miktex.org/download" : undefined,
      });
    });
  });
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
  const workspacePath = getWorkspacePath();

  await fs.mkdir(workspacePath, { recursive: true });

  // macOS uses Electron's helper so the local server never appears as a
  // second Dock app. Windows uses Electron itself in Node mode.
  const serverExecutable = process.platform === "darwin" ? process.helperExecPath || process.execPath : process.execPath;
  nextServer = spawn(serverExecutable, [serverPath], {
    cwd: runtimePath,
    env: {
      ...latexEnvironment(),
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
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

  mainWindow.webContents.on("context-menu", (_event, params) => {
    const selectedText = typeof params.selectionText === "string" ? params.selectionText.trim() : "";
    const template = [];

    // Keep the familiar Mac editing actions available exactly where people
    // expect them, then add Quire's writing action only when text is selected.
    if (params.isEditable) {
      template.push(
        { role: "undo", enabled: params.editFlags.canUndo },
        { role: "redo", enabled: params.editFlags.canRedo },
        { type: "separator" },
        { role: "cut", enabled: selectedText.length > 0 },
        { role: "copy", enabled: selectedText.length > 0 },
        { role: "paste", enabled: params.editFlags.canPaste },
        { role: "pasteAndMatchStyle", enabled: params.editFlags.canPaste },
        { type: "separator" },
        { role: "selectAll", enabled: params.editFlags.canSelectAll },
      );
    } else if (selectedText) {
      template.push({ role: "copy" });
    }

    if (selectedText) {
      if (template.length > 0) template.push({ type: "separator" });
      template.push({
        label: "Send selection to Quire Draft",
        click: () => mainWindow?.webContents.send("quire:open-draft-for-selection", { text: selectedText }),
      });
    }

    if (template.length > 0) Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  return mainWindow.loadURL(`${localServerUrl}/app`);
}

async function restartLocalServer() {
  if (nextServer) nextServer.kill();
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
  const workspacePath = path.resolve(getWorkspacePath());
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
      defaultPath: getWorkspacePath(),
      buttonLabel: "Use this folder",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) return { cancelled: true };

    const workspacePath = result.filePaths[0];
    await saveWorkspacePath(workspacePath);
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

  ipcMain.handle("quire:get-compiler-status", () => getCompilerStatus());

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
      customEndpoint: provider === "custom" ? preferences.customEndpoint : "",
    };
  });

  ipcMain.handle("quire:save-ai-settings", async (_event, input) => {
    const current = await readAiAssistantPreferences();
    const provider = normalizeAiProvider(input?.provider, current.provider);
    const model = normalizeAiModel(input?.model, provider);
    const encryptedApiKeys = { ...current.encryptedApiKeys };
    const customEndpoint = provider === "custom"
      ? normalizeCustomAiEndpoint(input?.customEndpoint)
      : current.customEndpoint;

    if (provider === "custom" && !customEndpoint) {
      throw new Error("Enter a secure OpenAI-compatible API base URL for the custom provider.");
    }

    if (input?.removeApiKey === true) {
      delete encryptedApiKeys[provider];
    } else if (typeof input?.apiKey === "string" && input.apiKey.trim()) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("Secure system credential storage is not available, so Quire cannot securely save an AI API key.");
      }
      encryptedApiKeys[provider] = safeStorage.encryptString(input.apiKey.trim()).toString("base64");
    }

    await fs.mkdir(app.getPath("userData"), { recursive: true });
    await fs.writeFile(getAiAssistantPreferencesPath(), JSON.stringify({ provider, model, encryptedApiKeys, customEndpoint }, null, 2));
    return {
      provider,
      providerLabel: AI_PROVIDERS[provider].label,
      model,
      keyConfigured: Boolean(encryptedApiKeys[provider]),
      customEndpoint: provider === "custom" ? customEndpoint : "",
    };
  });

  ipcMain.handle("quire:list-ai-models", async (_event, input) => listAiModels(input || {}));
  // Electron replaces errors thrown through ipcRenderer.invoke with a generic
  // “Provider returned error” message on Windows. Return a serialisable result
  // instead, so Quire Draft can show the writer the useful provider detail.
  ipcMain.handle("quire:assist-writing", async (_event, input) => {
    try {
      return { ok: true, ...(await requestWritingAssistance(input || {})) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Quire Draft could not complete that request.",
      };
    }
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
  if (nextServer) nextServer.kill();
});
