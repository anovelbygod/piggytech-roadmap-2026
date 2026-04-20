// Run this before using the admin panel: cd ~/Desktop/piggytech-roadmap && node server.js
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = 8080;
const ROOT    = __dirname;
const DATA_JS = path.join(ROOT, 'data.js');
const BACKUP  = path.join(ROOT, 'data.backup.js');

// Snapshot original data.js once so /reset-data can restore it
if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(DATA_JS, BACKUP);
  console.log('Defaults snapshot created → data.backup.js');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.ico':  'image/x-icon',
};

function sendJSON(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 4e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
  const url      = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /save-data — serialise DATA back to data.js
  if (req.method === 'POST' && pathname === '/save-data') {
    try {
      const raw  = await collectBody(req);
      const data = JSON.parse(raw);
      // Write compact JS that the browser can load as a global
      fs.writeFileSync(DATA_JS, `var DATA=${JSON.stringify(data)};\n`, 'utf8');
      console.log(`[${new Date().toISOString()}] data.js updated`);
      sendJSON(res, 200, { ok: true });
    } catch (e) {
      console.error('save-data error:', e.message);
      sendJSON(res, 400, { ok: false, error: e.message });
    }
    return;
  }

  // POST /reset-data — restore the original backup
  if (req.method === 'POST' && pathname === '/reset-data') {
    try {
      fs.copyFileSync(BACKUP, DATA_JS);
      console.log(`[${new Date().toISOString()}] data.js reset to defaults`);
      sendJSON(res, 200, { ok: true });
    } catch (e) {
      console.error('reset-data error:', e.message);
      sendJSON(res, 500, { ok: false, error: e.message });
    }
    return;
  }

  // GET — static file serving
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  const rel      = pathname === '/' ? 'index.html' : pathname;
  const filePath = path.normalize(path.join(ROOT, rel));

  // Block directory traversal
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Prevent data.js from being stale-cached
  if (pathname === '/data.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
  } catch (e) {
    console.error('Unhandled request error:', e.message);
    if (!res.headersSent) sendJSON(res, 500, { ok: false, error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`\nRoadmap server  →  http://localhost:${PORT}`);
  console.log(`Roadmap view    →  http://localhost:${PORT}/index.html`);
  console.log(`Admin panel     →  http://localhost:${PORT}/admin.html\n`);
});
