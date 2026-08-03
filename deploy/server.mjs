import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 18030);
const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "public");
const publicPrefix = `${publicDir}${sep}`;

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const baseHeaders = {
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function sendText(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    ...baseHeaders,
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method Not Allowed\n", { Allow: "GET, HEAD" });
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/healthz") {
    const body = '{"status":"ok"}\n';
    response.writeHead(200, {
      ...baseHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(request.method === "HEAD" ? undefined : body);
    return;
  }

  // The deployed product is the component playground. Keep the local query-
  // based entry points available without changing their development behavior.
  if (url.pathname === "/" && url.search === "") {
    response.writeHead(302, { ...baseHeaders, Location: "/?playground" });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    sendText(response, 400, "Bad Request\n");
    return;
  }

  const requestedPath = resolve(publicDir, `.${pathname}`);
  if (requestedPath !== publicDir && !requestedPath.startsWith(publicPrefix)) {
    sendText(response, 403, "Forbidden\n");
    return;
  }

  let filePath = requestedPath;
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = resolve(filePath, "index.html");
    await stat(filePath);
  } catch {
    filePath = resolve(publicDir, "index.html");
  }

  const fileStat = await stat(filePath);
  const isAsset = filePath.startsWith(resolve(publicDir, "assets") + sep);
  response.writeHead(200, {
    ...baseHeaders,
    "Cache-Control": isAsset
      ? "public, max-age=31536000, immutable"
      : "no-cache",
    "Content-Type": contentTypes.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
    "Content-Length": fileStat.size,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`bar.fzp.me static server listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
