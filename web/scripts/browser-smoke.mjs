import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const appUrl = process.env.APP_URL ?? "http://localhost:5173/";
const qaDir = path.resolve(process.cwd(), "..", ".qa");
const screenshotPath = path.join(qaDir, "browser-smoke-result.png");
const mixingScreenshotPath = path.join(qaDir, "browser-smoke-mixing.png");
const pourScreenshotPath = path.join(qaDir, "browser-smoke-pour-focus.png");
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
    const scene = document.querySelector('.scene').getBoundingClientRect();
    const zone = document.querySelector('.pour-zone').getBoundingClientRect();
    const flavor = document.querySelector('.scene-flavor').getBoundingClientRect();
    const flavorText = document.querySelector('.scene-flavor')?.textContent ?? '';
    const bottle = document.querySelector('.ingredient-bottle').getBoundingClientRect();
    const bottleRects = [...document.querySelectorAll('.ingredient-bottle')].map((element) => element.getBoundingClientRect());
    const rack = document.querySelector('.ingredient-dock.is-scene-rack');
    const rackStyle = getComputedStyle(rack);
    const visibleBottleLabels = [...document.querySelectorAll('.bottle-name, .bottle-amount')]
      .filter((element) => getComputedStyle(element).display !== 'none').length;
    const counterBottleRects = [...document.querySelectorAll('.is-counter-display .ingredient-bottle')]
      .map((element) => element.getBoundingClientRect());
    const header = document.querySelector('.game-header').getBoundingClientRect();
    const deck = document.querySelector('.control-deck').getBoundingClientRect();
    const glassOption = document.querySelector('.glass-option').getBoundingClientRect();
    const bartender = document.querySelector('.octopus').getBoundingClientRect();
    const counter = document.querySelector('.counter').getBoundingClientRect();
    const cssCounter = document.querySelector('.counter');
    const backgroundRaster = document.querySelector('.scene-raster-background');
    const glassStack = document.querySelector('.glass-visual-stack');
    const glassRaster = document.querySelector('.glass-raster');
    const glassRasterRect = glassRaster.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      frame: { width: frame.width, height: frame.height },
      zone: { right: zone.right },
      flavor: { left: flavor.left },
      flavorUi: {
        widthRatio: flavor.width / scene.width,
        usesChineseLabels: ['甜度', '酸度', '苦度', '酒精感', '清新度', '酒体'].every((label) => flavorText.includes(label)),
        hasEnglishLabels: ['SWEET', 'SOUR', 'BITTER', 'ALCOHOL', 'FRESH', 'BODY'].some((label) => flavorText.includes(label)),
        hasMoodAxis: Boolean(document.querySelector('.scene-flavor .mood-layer')) && flavorText.includes('忧郁') && flavorText.includes('喜悦'),
      },
      bottle: { width: bottle.width, height: bottle.height },
      bottles: document.querySelectorAll('.ingredient-bottle').length,
      sceneBottles: document.querySelectorAll('.is-scene-rack .ingredient-bottle').length,
      counterBottles: document.querySelectorAll('.is-counter-display .ingredient-bottle').length,
      deckBottles: document.querySelectorAll('.control-deck .ingredient-bottle').length,
      glassOptions: document.querySelectorAll('.glass-option').length,
      rackPages: document.querySelectorAll('.rack-pagination button').length,
      reservedSlots: document.querySelectorAll('.rack-expansion-slot').length,
      visibleBottleLabels,
      rackShell: {
        backgroundImage: rackStyle.backgroundImage,
        backgroundColor: rackStyle.backgroundColor,
        borderTopWidth: rackStyle.borderTopWidth,
        boxShadow: rackStyle.boxShadow,
      },
      restingCounterOpacity: Number.parseFloat(getComputedStyle(document.querySelector('.counter-raster')).opacity),
      restingCssCounterOpacity: Number.parseFloat(getComputedStyle(cssCounter).opacity),
      backgroundLoaded: Boolean(backgroundRaster?.complete && backgroundRaster.naturalWidth > 0),
      allBottlesLeft: bottleRects.every((rect) => rect.right <= frame.left + frame.width * 0.66),
      noCounterBottles: counterBottleRects.length === 0,
      counterBottlesOnLeftTable: counterBottleRects.length === 0 || counterBottleRects.every((rect) => (
        rect.right <= frame.left + frame.width * 0.42 &&
        rect.bottom > scene.top + scene.height * 0.55 &&
        rect.bottom < scene.top + scene.height * 0.69
      )),
      bartenderOccludedByCounter: counter.top < bartender.bottom,
      glassVisual: {
        mode: glassStack?.dataset.visualMode,
        rasterOpacity: Number.parseFloat(getComputedStyle(glassRaster).opacity),
        rasterSrc: glassRaster?.getAttribute('src'),
        widthRatio: glassRasterRect.width / scene.width,
        heightRatio: glassRasterRect.height / scene.height,
        bottomRatio: (glassRasterRect.bottom - scene.top) / scene.height,
        contactShadowOpacity: Number.parseFloat(getComputedStyle(glassStack, '::after').opacity),
        smallerThanBartender: glassRasterRect.width < bartender.width * 0.72,
      },
      edgeUi: { headerHeight: header.height, deckHeight: deck.height, glassOptionHeight: glassOption.height },
    };
  })()`);
  const ratio = layout.frame.width / layout.frame.height;
  if (
    layout.bottles !== 19 ||
    layout.sceneBottles !== 19 ||
    layout.counterBottles !== 0 ||
    layout.deckBottles !== 0 ||
    layout.glassOptions !== 4 ||
    layout.rackPages !== 0 ||
    layout.reservedSlots !== 0 ||
    layout.visibleBottleLabels !== 0 ||
    layout.rackShell.backgroundImage !== 'none' ||
    !['transparent', 'rgba(0, 0, 0, 0)'].includes(layout.rackShell.backgroundColor) ||
    layout.rackShell.borderTopWidth !== '0px' ||
    layout.rackShell.boxShadow !== 'none' ||
    layout.restingCounterOpacity > 0.01 ||
    layout.restingCssCounterOpacity > 0.01 ||
    !layout.backgroundLoaded ||
    !layout.allBottlesLeft ||
    !layout.counterBottlesOnLeftTable ||
    layout.glassVisual.mode !== 'asset' ||
    layout.glassVisual.rasterOpacity < 0.7 ||
    !layout.glassVisual.rasterSrc?.includes('/glassware/highball.png') ||
    layout.glassVisual.widthRatio > 0.22 ||
    layout.glassVisual.heightRatio > 0.25 ||
    layout.glassVisual.bottomRatio < 0.65 ||
    layout.glassVisual.bottomRatio > 0.72 ||
    layout.glassVisual.contactShadowOpacity < 0.6 ||
    !layout.glassVisual.smallerThanBartender ||
    layout.flavorUi.widthRatio < 0.3 ||
    !layout.flavorUi.usesChineseLabels ||
    layout.flavorUi.hasEnglishLabels ||
    !layout.flavorUi.hasMoodAxis ||
    layout.edgeUi.headerHeight > 42 ||
    layout.edgeUi.deckHeight > 64 ||
    layout.edgeUi.glassOptionHeight < 44 ||
    layout.viewport.scrollWidth > layout.viewport.width ||
    Math.abs(ratio - 9 / 16) > 0.01 ||
    layout.zone.right > layout.flavor.left ||
    layout.bottle.width < 43.5 ||
    layout.bottle.height < 44
  ) {
    throw new Error(`Mobile layout failed acceptance: ${JSON.stringify(layout)}`);
  }

  const mixingScreenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(mixingScreenshotPath, Buffer.from(mixingScreenshot.data, "base64"));

  const counterDragPoints = await evaluate(`(() => {
    const bottle = document.querySelector('[data-ingredient-id="ad-milk"]').getBoundingClientRect();
    const zone = document.querySelector('.pour-zone').getBoundingClientRect();
    return {
      from: { x: bottle.left + bottle.width / 2, y: bottle.top + bottle.height / 2 },
      to: { x: zone.left + zone.width / 2, y: zone.top + zone.height * 0.72 },
    };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: counterDragPoints.from.x, y: counterDragPoints.from.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: counterDragPoints.from.x, y: counterDragPoints.from.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: counterDragPoints.to.x, y: counterDragPoints.to.y, button: "left" });
  await waitFor("document.querySelector('.scene')?.classList.contains('is-pour-focus')");
  const counterPour = await evaluate(`(() => ({
    chineseName: document.querySelector('.pour-ingredient-label')?.textContent ?? '',
    foregroundAsset: document.querySelector('.pour-bottle-raster')?.getAttribute('src') ?? '',
    originalBottleHidden: Number.parseFloat(getComputedStyle(document.querySelector('[data-ingredient-id="ad-milk"]')).opacity) <= 0.01,
  }))()`);
  if (!counterPour.chineseName.includes('AD 钙奶') || !counterPour.foregroundAsset.includes('/ingredients-expanded/ad-milk.png') || !counterPour.originalBottleHidden) {
    throw new Error(`Counter ingredient pour failed: ${JSON.stringify(counterPour)}`);
  }
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: counterDragPoints.to.x, y: counterDragPoints.to.y, button: "left", clickCount: 1 });
  await waitFor("!document.querySelector('.scene')?.classList.contains('is-pour-focus')");

  await send("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete'");
  await waitFor("Boolean(document.querySelector('.ingredient-bottle'))");
  await evaluate("new Promise((resolve) => setTimeout(resolve, 500))");

  await evaluate(`(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/api/generate-drink-story')) {
        return Promise.resolve(new Response(JSON.stringify({
          name: '星港余温',
          tagline: '把夜色留给杯底的一点光',
          description: '清亮的香气穿过微苦与甜意，像一段刚刚松开的心事。最后留下温和而明快的余韵。',
        }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }
      return nativeFetch(input, init);
    };
    return true;
  })()`);

  await evaluate("document.querySelectorAll('.glass-option')[1].click(); true");
  await waitFor("Boolean(document.querySelector('.dynamic-glass.glass-tumbler'))");
  await waitFor("document.querySelector('.glass-raster')?.getAttribute('src')?.includes('/glassware/tumbler.png')");
  await waitFor("document.querySelector('.glass-visual-stack')?.dataset.visualMode === 'asset'");

  const dragPoints = await evaluate(`(() => {
    const bottle = document.querySelector('.ingredient-bottle').getBoundingClientRect();
    const zone = document.querySelector('.pour-zone').getBoundingClientRect();
    return {
      from: { x: bottle.left + bottle.width / 2, y: bottle.top + bottle.height / 2 },
      to: { x: zone.left + zone.width / 2, y: zone.top + zone.height * 0.72 },
    };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: dragPoints.from.x, y: dragPoints.from.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: dragPoints.from.x, y: dragPoints.from.y, button: "left", clickCount: 1 });
  await wait(60);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: dragPoints.to.x, y: dragPoints.to.y, button: "left" });
  await waitFor("document.querySelector('.scene')?.classList.contains('is-pour-focus')");
  await waitFor("document.querySelector('.glass-visual-stack')?.dataset.visualMode === 'dynamic'");
  await waitFor("Number.parseFloat(getComputedStyle(document.querySelector('.glass-raster')).opacity) <= 0.1");
  await waitFor("Number.parseFloat(getComputedStyle(document.querySelector('.counter-raster')).opacity) >= 0.5");
  const focusVisual = await evaluate(`(() => {
    const bottle = document.querySelector('.pour-bottle-raster').getBoundingClientRect();
    const shelfBottleOpacity = Number.parseFloat(getComputedStyle(document.querySelector('.ingredient-bottle.is-active')).opacity);
    const glass = document.querySelector('.dynamic-glass svg').getBoundingClientRect();
    const stream = document.querySelector('.pour-stream').getBoundingClientRect();
    const streamPath = document.querySelector('.pour-stream-path')?.getAttribute('d') ?? '';
    const zoneStyle = getComputedStyle(document.querySelector('.pour-zone'));
    return {
      bottleHeight: bottle.height,
      glassHeight: glass.height,
      bottleToGlassRatio: bottle.height / glass.height,
      streamReachesGlass: stream.bottom >= glass.top,
      hasCurvedStream: streamPath.includes('C'),
      shelfBottleHidden: shelfBottleOpacity <= 0.01,
      impactEffects: document.querySelectorAll('.liquid-impact-ring, .liquid-impact-plume').length,
      zoneBorderColor: zoneStyle.borderTopColor,
      zoneBackgroundImage: zoneStyle.backgroundImage,
    };
  })()`);
  if (
    focusVisual.bottleToGlassRatio < 0.75 ||
    !focusVisual.streamReachesGlass ||
    !focusVisual.hasCurvedStream ||
    !focusVisual.shelfBottleHidden ||
    focusVisual.impactEffects < 2 ||
    !['transparent', 'rgba(0, 0, 0, 0)'].includes(focusVisual.zoneBorderColor) ||
    focusVisual.zoneBackgroundImage !== 'none'
  ) {
    throw new Error(`Pour foreground scale/effects failed: ${JSON.stringify(focusVisual)}`);
  }
  const focusCounterOpacity = await evaluate("Number.parseFloat(getComputedStyle(document.querySelector('.counter-raster')).opacity)");
  if (focusCounterOpacity < 0.5) throw new Error(`Pour Focus counter layer did not appear: ${focusCounterOpacity}`);
  await wait(340);
  const pourScreenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(pourScreenshotPath, Buffer.from(pourScreenshot.data, "base64"));
  const pointerTotal = await evaluate("Number.parseInt(document.querySelector('.system-state b')?.textContent ?? '0', 10)");
  if (pointerTotal < 2) throw new Error(`Pointer pouring did not increment continuously: ${pointerTotal}%`);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: dragPoints.to.x, y: dragPoints.to.y, button: "left", clickCount: 1 });
  await waitFor("!document.querySelector('.scene')?.classList.contains('is-pour-focus')");
  const releasedTotal = await evaluate("Number.parseInt(document.querySelector('.system-state b')?.textContent ?? '0', 10)");
  await waitFor("document.querySelector('.glass-visual-stack')?.dataset.visualMode === 'asset'");
  await waitFor("Number.parseFloat(getComputedStyle(document.querySelector('.glass-raster')).opacity) >= 0.75");
  await wait(250);
  const settledTotal = await evaluate("Number.parseInt(document.querySelector('.system-state b')?.textContent ?? '0', 10)");
  if (settledTotal !== releasedTotal) throw new Error(`Pour continued after pointer release: ${releasedTotal}% -> ${settledTotal}%`);

  await evaluate(`(async () => {
    const bottle = document.querySelector('.ingredient-bottle');
    for (let index = 0; index < 24; index += 1) {
      bottle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 24));
    }
    return true;
  })()`);
  const expectedTotal = Math.min(100, releasedTotal + 24);
  await waitFor(`document.querySelector('.system-state b')?.textContent === '${expectedTotal}%'`);

  const beforeServe = await evaluate(`(() => ({
    total: document.querySelector('.system-state b')?.textContent,
    serveEnabled: !document.querySelector('.serve-button')?.disabled,
  }))()`);
  if (!beforeServe.serveEnabled) throw new Error("Serve should be enabled after adding an ingredient.");

  await evaluate("document.querySelector('.serve-button').click(); true");
  await waitFor("Boolean(document.querySelector('.card-reset'))", 6000);
  await waitFor("Boolean(document.querySelector('.card-story-title.is-success h2'))", 3000);

  const result = await evaluate(`(() => ({
    cardVisible: Boolean(document.querySelector('.drink-card')),
    recipeText: document.querySelector('.card-recipe')?.textContent,
    totalText: document.querySelector('.drink-card footer')?.textContent,
    storyName: document.querySelector('.card-story-title h2')?.textContent,
    storyTagline: document.querySelector('.card-story-title em')?.textContent,
    storyDescription: document.querySelector('.card-story-description')?.textContent,
    hasLegacySpecimenTitle: (document.querySelector('.drink-card header')?.textContent ?? '').includes('SPECIMEN //'),
  }))()`);
  if (
    !result.cardVisible ||
    !result.recipeText?.includes(`${expectedTotal}%`) ||
    result.storyName !== '星港余温' ||
    !result.storyTagline?.includes('杯底') ||
    !result.storyDescription?.includes('心事') ||
    result.hasLegacySpecimenTitle
  ) {
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

  console.log(JSON.stringify({
    layout,
    pointerPour: { pointerTotal, releasedTotal, settledTotal, focusCounterOpacity, focusVisual },
    counterPour,
    beforeServe,
    result,
    afterReset,
    screenshots: { mixingScreenshotPath, pourScreenshotPath, screenshotPath },
  }, null, 2));
} finally {
  for (const entry of pending.values()) entry.reject(new Error("Browser smoke test stopped."));
  socket?.close();
  browser.kill();
}
