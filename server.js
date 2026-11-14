// 盘见 Hub 演示静态服务（零依赖）
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
// 版本号：app.js 每次保存后变化，注入到 index.html 的引用里，杜绝浏览器拿旧缓存
let jsVersion = '0';
function refreshVersion() {
  try { jsVersion = String(Math.floor(fs.statSync(path.join(ROOT, 'app.js')).mtimeMs)); } catch (e) {}
}
refreshVersion();
fs.watch(path.join(ROOT), () => refreshVersion());
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }
  let requestPath;
  try {
    requestPath = decodeURIComponent(req.url.split('?')[0]);
    if (requestPath.includes('\0')) throw new URIError('Invalid path');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }
  const normalizedPath = requestPath.replace(/\\/g, '/');
  const file = normalizedPath === '/' ? path.join(ROOT, 'index.html') : path.resolve(ROOT, '.' + normalizedPath);
  const relative = path.relative(ROOT, file);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not Found'); return; }
    if (file.endsWith('index.html')) {
      const html = buf.toString().replace(/app\.js(\?v=\d+)?/g, 'app.js?v=' + jsVersion);
      buf = Buffer.from(html);
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
});
const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT === undefined ? 8791 : Number(process.env.PORT);
server.listen(port, host, () => console.log(`观潮看盘 demo: http://${host}:${server.address().port}`));
