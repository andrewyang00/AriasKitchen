'use strict';

const db = require('./db');
const storage = require('./lib/storage');
const moderation = require('./lib/moderation');
const { generateCharacterPoseSet } = require('./lib/characterGenerator');
const { POSES } = require('./lib/poses');

const POLL_INTERVAL_MS = 3000;
const PHOTO_RETENTION_MS = Number(process.env.PHOTO_RETENTION_MS || 24 * 60 * 60 * 1000);

async function processOneJob() {
  const job = db.claimNextPendingJob();
  if (!job) return false;

  console.log(`[worker] processing character ${job.token}`);
  try {
    const poses = await generateCharacterPoseSet({ photoPath: job.source_photo_path, poses: POSES });

    // Output-side moderation gate: don't trust generated art blindly just
    // because the input photo already passed the upload-time gate.
    for (const [key, buffer] of Object.entries(poses)) {
      const verdict = await moderation.moderateImage(buffer);
      if (verdict.blocked || verdict.flagged) {
        throw new Error(`generated pose "${key}" failed output moderation: ${verdict.reason}`);
      }
    }

    for (const [key, buffer] of Object.entries(poses)) {
      await storage.savePoseImage(job.token, POSES[key].file, buffer);
    }

    const poseFiles = Object.keys(poses).reduce((acc, key) => {
      acc[key] = POSES[key].file;
      return acc;
    }, {});
    db.updateCharacter(job.token, { status: 'ready', poses_json: JSON.stringify(poseFiles) });
    console.log(`[worker] character ${job.token} ready`);
  } catch (err) {
    console.error(`[worker] character ${job.token} failed:`, err.message);
    db.updateCharacter(job.token, { status: 'failed', error: err.message });
  } finally {
    await storage.deleteUploadedPhoto(job.source_photo_path);
    db.updateCharacter(job.token, { source_photo_deleted_at: db.nowIso() });
  }
  return true;
}

// Safety net independent of normal job completion (which already deletes
// the source photo regardless of outcome): catches anything stuck in
// 'processing'/'flagged' for longer than the retention window.
async function sweepStalePhotos() {
  const cutoff = new Date(Date.now() - PHOTO_RETENTION_MS).toISOString();
  const stale = db.findStalePhotos(cutoff);
  for (const row of stale) {
    console.warn(`[worker] retention sweep deleting overdue source photo for ${row.token}`);
    await storage.deleteUploadedPhoto(row.source_photo_path);
    db.updateCharacter(row.token, { source_photo_deleted_at: db.nowIso() });
  }
}

function startWorker() {
  const tick = async () => {
    try {
      await processOneJob();
      await sweepStalePhotos();
    } catch (err) {
      console.error('[worker] tick error:', err);
    }
  };
  tick();
  return setInterval(tick, POLL_INTERVAL_MS);
}

module.exports = { startWorker, processOneJob };
