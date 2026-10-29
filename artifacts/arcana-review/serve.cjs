const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    let url;
    try {
      url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(
      root,
      "." + (url === "/" ? "/artifacts/arcana-review/index.html" : url),
    );
    if (
      !file.startsWith(root + path.sep) ||
      !(
        /^\/public\/arcana\//.test(url) ||
        /^\/artifacts\/arcana-(review|count-audit)\//.test(url) ||
        url === "/"
      )
    ) {
      res.writeHead(403).end();
      return;
    }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file).pipe(res);
    });
  })
  .listen(4187, "127.0.0.1", () =>
    console.log("Revisão Arcano http://127.0.0.1:4187 | raiz " + root),
  );
