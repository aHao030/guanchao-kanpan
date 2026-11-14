const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createApi, sendError } = require('./api.cjs');
const { createSampleProvider } = require('./providers/sample-provider.cjs');

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function sendText(req, res, status, message, headers = {}) {
  const body = Buffer.from(message);
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': body.length, 'Cache-Control': 'no-store', ...headers });
  res.end(req.method === 'HEAD' ? undefined : body);
}

function createServer({
  publicRoot = path.resolve(__dirname, '../public'),
  provider = createSampleProvider(),
  version = require('../package.json').version,
} = {}) {
  const root = path.resolve(publicRoot);
  const api = createApi({ provider, version });
  return http.createServer(async (req, res) => {
    let requestPath;
    try {
      requestPath = decodeURIComponent(req.url.split('?')[0]);
      if (!requestPath.startsWith('/') || requestPath.includes('\0')) throw new URIError('Invalid path');
    } catch {
      if (req.url.startsWith('/api/')) sendError(req, res, 400, 'INVALID_URL', 'Invalid request URL');
      else sendText(req, res, 400, 'Bad Request');
      return;
    }
    const normalizedPath = requestPath.replace(/\\/g, '/');
    const isApi = normalizedPath === '/api' || normalizedPath.startsWith('/api/');
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isApi) sendError(req, res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and HEAD are supported', { Allow: 'GET, HEAD' });
      else sendText(req, res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }
    if (isApi) {
      try { await api(req, res, normalizedPath); }
      catch { sendError(req, res, 500, 'DATA_UNAVAILABLE', 'Market data is unavailable'); }
      return;
    }
    const file = normalizedPath === '/' ? path.join(root, 'index.html') : path.resolve(root, '.' + normalizedPath);
    const relative = path.relative(root, file);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
      sendText(req, res, 403, 'Forbidden');
      return;
    }
    fs.readFile(file, (error, original) => {
      if (error) { sendText(req, res, 404, 'Not Found'); return; }
      let body = original;
      if (path.basename(file) === 'index.html') {
        let version = '0';
        try { version = String(Math.floor(fs.statSync(path.join(root, 'app.js')).mtimeMs)); } catch {}
        body = Buffer.from(body.toString().replace(/app\.js(\?v=\d+)?/g, 'app.js?v=' + version));
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    });
  });
}

module.exports = { createServer };
