'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { startWorker } = require('./worker');
const { handleUpload, handleGetCharacter, handleAdminApprove, sendJson } = require('./routes/characters');
const { CHARACTERS_DIR } = require('./lib/storage');

const PORT = Number(process.env.PORT || 8787);
// A bit over the route's own MAX_PHOTO_BYTES to leave room for base64
// overhead (~33%) and the surrounding JSON envelope.
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const TOKEN_RE = /^[a-zA-Z0-9-]+$/;
const POSE_FILE_RE = /^[a-zA-Z0-9_.-]+\.(png|webp)$/;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(Object.assign(new Error('payload_too_large'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(Object.assign(new Error('invalid_json'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function setCors(res) {
  // Open CORS on purpose -- this is a public self-serve API the static game
  // (potentially hosted on a different origin/CDN) needs to call directly
  // from the browser, with no cookies/credentials involved.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);

  try {
    if (req.method === 'POST' && url.pathname === '/api/characters') {
      const body = await readJsonBody(req);
      return await handleUpload(res, body);
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'characters' && parts.length === 3) {
      if (!TOKEN_RE.test(parts[2])) return sendJson(res, 400, { error: 'invalid_token' });
      return handleGetCharacter(res, parts[2]);
    }

    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'admin' && parts[2] === 'characters' && parts[4] === 'approve') {
      if (!TOKEN_RE.test(parts[3])) return sendJson(res, 400, { error: 'invalid_token' });
      return handleAdminApprove(res, parts[3], req.headers['x-admin-token']);
    }

    // Static serving of generated pose art: GET /characters/<token>/<file>.
    // This is exactly what ACTIVE_CHARACTER.baseUrl points at on the game
    // client (see pancake-game/characters.js).
    if (req.method === 'GET' && parts[0] === 'characters' && parts.length === 3) {
      const [, token, file] = parts;
      if (!TOKEN_RE.test(token) || !POSE_FILE_RE.test(file)) {
        res.writeHead(400);
        return res.end();
      }
      const filePath = path.join(CHARACTERS_DIR, token, file);
      if (!filePath.startsWith(CHARACTERS_DIR) || !fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': file.endsWith('.webp') ? 'image/webp' : 'image/png' });
      return fs.createReadStream(filePath).pipe(res);
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true });
    }

    sendJson(res, 404, { error: 'not_found' });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    console.error('[server] request error:', err);
    sendJson(res, statusCode, { error: err.message || 'internal_error' });
  }
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(process.env.OPENAI_API_KEY
    ? '[server] OPENAI_API_KEY set -- real generation/moderation enabled'
    : '[server] No OPENAI_API_KEY -- running in MOCK mode (see .env.example)');
  startWorker();
});

module.exports = { server };
