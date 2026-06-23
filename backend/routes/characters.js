'use strict';

const crypto = require('node:crypto');
const db = require('../db');
const storage = require('../lib/storage');
const moderation = require('../lib/moderation');

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

async function handleUpload(res, body) {
  const { photoBase64, photoMimeType, childName, consent } = body;

  if (consent !== true) {
    return sendJson(res, 400, { error: 'consent_required', message: 'A parent/guardian consent confirmation is required.' });
  }
  if (!photoBase64 || typeof photoBase64 !== 'string') {
    return sendJson(res, 400, { error: 'photo_required' });
  }
  const ext = ALLOWED_EXT[photoMimeType];
  if (!ext) {
    return sendJson(res, 400, { error: 'unsupported_photo_type', allowed: Object.keys(ALLOWED_EXT) });
  }

  let buffer;
  try {
    buffer = Buffer.from(photoBase64, 'base64');
  } catch (err) {
    return sendJson(res, 400, { error: 'invalid_photo_encoding' });
  }
  if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) {
    return sendJson(res, 400, { error: 'photo_too_large_or_empty', maxBytes: MAX_PHOTO_BYTES });
  }

  // Upload-time moderation gate -- runs before anything is durably stored
  // beyond the short-lived buffer already in memory for this request.
  const verdict = await moderation.moderateImage(buffer);
  if (verdict.blocked) {
    return sendJson(res, 403, { error: 'blocked', reason: verdict.reason });
  }

  const token = crypto.randomUUID();
  const sourcePhotoPath = await storage.saveUploadedPhoto(token, buffer, ext);
  const status = verdict.flagged ? 'flagged' : 'pending';
  db.insertCharacter({
    token,
    childName: typeof childName === 'string' ? childName.slice(0, 60) : null,
    status,
    sourcePhotoPath,
  });

  if (verdict.flagged) {
    // MVP escalation path: a solo operator just needs to see this in logs
    // (or a log-shipping/alerting setup) and call the admin-approve route
    // below once they've reviewed it by hand.
    console.warn(`[upload] character ${token} held for manual review: ${verdict.reason}`);
  }

  return sendJson(res, 202, { token, status });
}

function handleGetCharacter(res, token) {
  const row = db.getCharacter(token);
  if (!row) return sendJson(res, 404, { error: 'not_found' });

  if (row.status === 'ready') {
    return sendJson(res, 200, {
      status: 'ready',
      characterId: row.token,
      name: row.child_name || undefined,
      poses: JSON.parse(row.poses_json || '{}'),
    });
  }
  if (row.status === 'failed') {
    return sendJson(res, 200, { status: 'failed', error: row.error });
  }
  return sendJson(res, 200, { status: row.status });
}

function handleAdminApprove(res, token, adminToken) {
  if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
    return sendJson(res, 401, { error: 'unauthorized' });
  }
  const row = db.getCharacter(token);
  if (!row) return sendJson(res, 404, { error: 'not_found' });
  if (row.status !== 'flagged') return sendJson(res, 409, { error: 'not_flagged', status: row.status });
  db.updateCharacter(token, { status: 'pending' });
  return sendJson(res, 200, { status: 'pending' });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

module.exports = { handleUpload, handleGetCharacter, handleAdminApprove, sendJson };
