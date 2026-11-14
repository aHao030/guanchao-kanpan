const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const { once } = require('node:events');
const { test } = require('node:test');

const projectRoot = path.join(__dirname, '..');

async function startPreview(t) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: projectRoot,
    env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  });

  return new Promise((resolve, reject) => {
    let output = '';
    let errors = '';
    const timeout = setTimeout(() => reject(new Error('Preview did not start')), 5000);
    child.stderr.on('data', chunk => { errors += chunk; });
    child.stdout.on('data', chunk => {
      output += chunk;
      const address = /http:\/\/127\.0\.0\.1:(\d+)/.exec(output);
      if (address) {
        clearTimeout(timeout);
        resolve(Number(address[1]));
      }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Preview exited (${code}): ${errors}`));
    });
  });
}

function request(port, requestPath = '/', method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: requestPath, method }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('preview uses a configured free port and serves a fresh application page', async t => {
  const port = await startPreview(t);
  const page = await request(port);
  assert.equal(page.status, 200);
  assert.equal(page.headers['cache-control'], 'no-store');
  assert.match(page.headers['content-type'], /text\/html.*utf-8/);
  assert.match(page.body, /workbench\.js/);
});

test('an invalid URL receives a bad-request response without taking down the preview', async t => {
  const port = await startPreview(t);
  assert.equal((await request(port, '/%E0%A4%A')).status, 400);
  assert.equal((await request(port, '/%00')).status, 400);
  assert.equal((await request(port)).status, 200);
});

test('requests outside the public directory are forbidden, including similarly named paths', async t => {
  const port = await startPreview(t);
  for (const requestPath of ['/%2e%2e/server.js', '/%2e%2e/public-private/index.html', '/..%5cserver.js']) {
    assert.equal((await request(port, requestPath)).status, 403, requestPath);
  }
  assert.equal((await request(port, '/data/treemap.js')).status, 200);
});

test('HEAD returns the same asset metadata without a response body', async t => {
  const port = await startPreview(t);
  const asset = await request(port, '/style.css');
  const head = await request(port, '/style.css', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal(Number(head.headers['content-length']), Buffer.byteLength(asset.body));
  assert.equal(head.headers['content-type'], asset.headers['content-type']);
  assert.equal(head.headers['cache-control'], 'no-store');
});

test('the static preview rejects write requests and advertises its supported methods', async t => {
  const port = await startPreview(t);
  const response = await request(port, '/', 'POST');
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, 'GET, HEAD');
  assert.equal((await request(port)).status, 200);
});
