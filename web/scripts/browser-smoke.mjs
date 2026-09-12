import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const appUrl = process.env.APP_URL ?? "http://localhost:5173/";
const qaDir = path.resolve(process.cwd(), "..", ".qa");
const screenshotPath = path.join(qaDir, "browser-smoke-result.png");
const profilePath = path.join(qaDir, `edge-smoke-${process.pid}`);
const debugPort = 9333;

const candidates = process.platform === "win32"
  ? [
      process.env.BROWSER_PATH,
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ]
  : process.platform === "darwin"
    ? [
        process.env.BROWSER_PATH,
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      ]
    : [process.env.BROWSER_PATH, "/usr/bin/google-chrome", "/usr/bin/microsoft-edge"];

const browserPath = candidates.find((candidate) => candidate && existsSync(candidate));
if (!browserPath) throw new Error("No supported Chrome/Edge executable found. Set BROWSER_PATH.");

mkdirSync(qaDir, { recursive: true });

const browser = spawn(browserPath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-proxy-server",
  `--remote-debugging-port=${debugPort}`,
  "--window-size=500,900",
  `--user-data-dir=${profilePath}`,
  appUrl,
], { stdio: "ignore", windowsHide: true });

let socket;
let commandId = 0;
const pending = new Map();

async function findPage() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
      const page = pages.find((entry) => entry.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Browser debugging endpoint may still be starting.
    }
    await wait(100);
  }
  throw new Error("Browser debugging endpoint did not become ready.");
}

function send(method, params = {}) {
  commandId += 1;
  return new Promise((resolve, reject) => {
    pending.set(commandId, { resolve, reject });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? "Browser evaluation failed");
  return response.result?.value;
}

async function waitFor(expression, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return true;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

try {
  const page = await findPage();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result ?? {});
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete'");
  await waitFor("Boolean(document.querySelector('.ingredient-bottle'))");
  // SSR markup can appear before React has attached keyboard and pointer handlers.
  await evaluate("new Promise((resolve) => setTimeout(resolve, 500))");

  const layout = await evaluate(`(() => {
    const frame = document.querySelector('.game-frame').getBoundingClientRect();
    const zone = document.querySelector('.pour-zone').getBoundingClientRect();
    const flavor = document.querySelector('.scene-flavor').getBoundingClientRect();
    const bottle = document.querySelector('.ingredient-bottle').getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      frame: { width: frame.width, height: frame.height },
      zone: { right: zone.right },
      flavor: { left: flavor.left },
      bottle: { width: bottle.width, height: bottle.height },
      bottles: document.querySelectorAll('.ingredient-bottle').length,
    };
  })()`);
  const ratio = layout.frame.width / layout.frame.height;
  if (
    layout.bottles !== 8 ||
    layout.viewport.scrollWidth > layout.viewport.width ||
    Math.abs(ratio - 9 / 16) > 0.01 ||
    layout.zone.right > layout.flavor.left ||
    layout.bottle.width < 44 ||
    layout.bottle.height < 44
  ) {
    throw new Error(`Mobile layout failed acceptance: ${JSON.stringify(layout)}`);
  }

  await evaluate(`(async () => {
    const bottle = document.querySelector('.ingredient-bottle');
    for (let index = 0; index < 24; index += 1) {
      bottle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 24));
    }
    return true;
  })()`);
  await waitFor("document.querySelector('.system-state b')?.textContent === '24%'");

  const beforeServe = await evaluate(`(() => ({
    total: document.querySelector('.system-state b')?.textContent,
    serveEnabled: !document.querySelector('.serve-button')?.disabled,
  }))()`);
  if (!beforeServe.serveEnabled) throw new Error("Serve should be enabled after adding an ingredient.");

  await evaluate("document.querySelector('.serve-button').click(); true");
  await waitFor("Boolean(document.querySelector('.card-reset'))", 6000);

  const result = await evaluate(`(() => ({
    cardVisible: Boolean(document.querySelector('.drink-card')),
    recipeText: document.querySelector('.card-recipe')?.textContent,
    totalText: document.querySelector('.drink-card footer')?.textContent,
  }))()`);
  if (!result.cardVisible || !result.recipeText?.includes("24%")) {
    throw new Error("Result card did not preserve the mixed recipe.");
  }

  const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

  await evaluate("document.querySelector('.card-reset').click(); true");
  await waitFor("!document.querySelector('.drink-card') && document.querySelector('.system-state b')?.textContent === '0%'");

  const afterReset = await evaluate(`(() => ({
    total: document.querySelector('.system-state b')?.textContent,
    cardVisible: Boolean(document.querySelector('.drink-card')),
    serveDisabled: document.querySelector('.serve-button')?.disabled,
  }))()`);

  console.log(JSON.stringify({ layout, beforeServe, result, afterReset, screenshotPath }, null, 2));
} finally {
  for (const entry of pending.values()) entry.reject(new Error("Browser smoke test stopped."));
  socket?.close();
  browser.kill();
}
