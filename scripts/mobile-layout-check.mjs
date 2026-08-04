import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.argv[2] ?? "http://127.0.0.1:5173/?playground";
const output = resolve(process.argv[3] ?? join(projectRoot, "mobile-layout-check.png"));
const width = Number(process.argv[4] ?? 390);
const height = Number(process.argv[5] ?? 844);
const navIndex = process.argv[6] === undefined ? null : Number(process.argv[6]);
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = 9300 + Math.floor(Math.random() * 300);
const profile = await mkdtemp(join(tmpdir(), "liquid-nav-mobile-"));

const browser = spawn(
  edgePath,
  [
    "--headless=new",
    "--hide-scrollbars",
    "--use-angle=swiftshader",
    "--no-first-run",
    "--disable-background-networking",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore", windowsHide: true },
);

async function getPageTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page) return page;
    } catch {
      // Edge is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error("Timed out waiting for the Edge DevTools endpoint");
}

const target = await getPageTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let sequence = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (!message.id || !pending.has(message.id)) return;
  const { resolve: resolveCall, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolveCall(message.result);
});

await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener("open", resolveOpen, { once: true });
  socket.addEventListener("error", rejectOpen, { once: true });
});

function call(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveCall, reject) => {
    pending.set(id, { resolve: resolveCall, reject });
  });
}

try {
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: height,
  });
  await call("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  await call("Page.navigate", { url });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 4300));

  if (Number.isInteger(navIndex)) {
    await call("Runtime.evaluate", {
      expression: `document.querySelectorAll('.lab-nav > .liquid-nav > .nav-items > .nav-item')[${navIndex}]?.click()`,
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1800));
  }

  const evaluation = await call("Runtime.evaluate", {
    expression: `(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      const controls = document.querySelector('.lab-controls');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        },
        header: rect('.lab-header'),
        actions: rect('.lab-actions'),
        stage: rect('.lab-stage'),
        mainNav: rect('.lab-nav'),
        miniNav: rect('.motion-preset-nav'),
        customize: rect('.lab-customize'),
        controls: {
          rect: rect('.lab-controls'),
          columns: controls ? getComputedStyle(controls).gridTemplateColumns : null,
          count: document.querySelectorAll('.lab-range').length,
        },
      };
    })()`,
    returnByValue: true,
  });

  const screenshot = await call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(output, Buffer.from(screenshot.data, "base64"));
  console.log(JSON.stringify({ ...evaluation.result.value, screenshot: output }, null, 2));
} finally {
  try {
    await call("Browser.close");
  } catch {
    browser.kill();
  }
  socket.close();
  await new Promise((resolveExit) => {
    if (browser.exitCode !== null) resolveExit();
    else browser.once("exit", resolveExit);
  });
  await rm(profile, { recursive: true, force: true });
}
