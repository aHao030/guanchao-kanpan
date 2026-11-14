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
http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
  const file = path.join(ROOT, p === '/' || p === '\\' ? 'index.html' : p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not Found'); return; }
    if (file.endsWith('index.html')) {
      const html = buf.toString().replace(/app\.js(\?v=\d+)?/g, 'app.js?v=' + jsVersion);
      buf = Buffer.from(html);
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(8791, '127.0.0.1', () => console.log('观潮看盘 demo: http://127.0.0.1:8791'));
