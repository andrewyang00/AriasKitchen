'use strict';

// Uses Node's built-in node:sqlite (no native module to install/compile --
// deliberate, for a zero-npm-dependency MVP skeleton). It's experimental in
// Node 22 but synchronous and single-connection, which is exactly the
// "single worker process polling a job table" shape the project plan calls
// for at this scale -- no concurrent-writer races to guard against.
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'db.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    token TEXT PRIMARY KEY,
    child_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    poses_json TEXT,
    error TEXT,
    source_photo_path TEXT,
    source_photo_deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

function nowIso() {
  return new Date().toISOString();
}

function insertCharacter({ token, childName, status, sourcePhotoPath }) {
  const ts = nowIso();
  db.prepare(`
    INSERT INTO characters (token, child_name, status, source_photo_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, childName || null, status, sourcePhotoPath || null, ts, ts);
}

function getCharacter(token) {
  return db.prepare('SELECT * FROM characters WHERE token = ?').get(token) || null;
}

function updateCharacter(token, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k]);
  db.prepare(`UPDATE characters SET ${setClause}, updated_at = ? WHERE token = ?`)
    .run(...values, nowIso(), token);
}

// Single-worker-safe: this process is the only writer, so claiming a job by
// immediately flipping it to 'processing' in the same synchronous call is
// enough to avoid double-processing -- no SELECT...FOR UPDATE/transaction
// needed the way a multi-worker setup would require.
function claimNextPendingJob() {
  const row = db.prepare(`
    SELECT * FROM characters WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1
  `).get();
  if (!row) return null;
  updateCharacter(row.token, { status: 'processing' });
  return row;
}

function findStalePhotos(olderThanIso) {
  return db.prepare(`
    SELECT token, source_photo_path FROM characters
    WHERE source_photo_path IS NOT NULL
      AND source_photo_deleted_at IS NULL
      AND created_at < ?
  `).all(olderThanIso);
}

module.exports = {
  DATA_DIR,
  insertCharacter,
  getCharacter,
  updateCharacter,
  claimNextPendingJob,
  findStalePhotos,
  nowIso,
};
