import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch {
    res.writeHead(400).end("Bad request");
    return;
  }
  if (pathname === "/") pathname = "/index.html";
  const target = path.join(ROOT, path.normalize(pathname).replace(/^([/\\])+/, ""));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end('<h1 style="font-family:sans-serif">404 — not found</h1><p><a href="/">Back to the shop</a></p>');
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache"
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n  NŪN Atelier — green edition\n  http://localhost:${PORT}\n`);
});
