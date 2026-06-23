'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { DATA_DIR } = require('../db');

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const CHARACTERS_DIR = path.join(DATA_DIR, 'characters');

async function saveUploadedPhoto(token, buffer, ext) {
  const dir = path.join(UPLOAD_DIR, token);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `source.${ext}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function deleteUploadedPhoto(filePath) {
  if (!filePath) return;
  await fs.rm(path.dirname(filePath), { recursive: true, force: true }).catch(() => {});
}

async function savePoseImage(token, fileName, buffer) {
  const dir = path.join(CHARACTERS_DIR, token);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);
}

module.exports = {
  saveUploadedPhoto,
  deleteUploadedPhoto,
  savePoseImage,
  UPLOAD_DIR,
  CHARACTERS_DIR,
};
