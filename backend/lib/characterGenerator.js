'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { buildPosePrompt } = require('./stylePrompt');

const REAL_KEY = process.env.OPENAI_API_KEY;

// MOCK MODE fallback art: the existing shipped default-character images,
// returned as a clearly-logged stand-in result so the whole pipeline
// (upload -> moderate -> "generate" -> store -> serve -> render in-game) is
// runnable and testable end-to-end with zero secrets. Set OPENAI_API_KEY to
// switch to real generation.
const DEFAULT_ART_DIR = path.join(__dirname, '..', '..', 'pancake-game', 'assets', 'images');

/**
 * Swappable character-generation interface. Today this either calls the
 * OpenAI Images API directly or falls back to mock art -- a different
 * provider (Gemini/Imagen, a fine-tuned model, etc.) can replace the
 * generateRealPoseSet() implementation without changing any caller.
 *
 * @param {{ photoPath: string, poses: Record<string, {file: string, description: string}> }} params
 * @returns {Promise<Record<string, Buffer>>} pose key -> PNG buffer (RGBA, transparent bg)
 */
async function generateCharacterPoseSet({ photoPath, poses }) {
  return REAL_KEY ? generateRealPoseSet({ photoPath, poses }) : generateMockPoseSet(poses);
}

async function generateMockPoseSet(poses) {
  const out = {};
  for (const [key, pose] of Object.entries(poses)) {
    console.warn(`[characterGenerator] MOCK MODE (no OPENAI_API_KEY) — returning default art for pose "${key}"`);
    out[key] = await fs.readFile(path.join(DEFAULT_ART_DIR, pose.file));
  }
  return out;
}

async function generateRealPoseSet({ photoPath, poses }) {
  const photoBuffer = await fs.readFile(photoPath);
  const out = {};
  // Sequential, not parallel: later poses can/should eventually pass an
  // earlier pose's own output back in as an extra reference image to
  // reduce cross-pose drift (see project plan, "chainFromFirstPose") --
  // that needs poses generated in order, so keep this loop sequential even
  // though it isn't exploited yet.
  for (const [key, pose] of Object.entries(poses)) {
    out[key] = await generateOnePose({ photoBuffer, prompt: buildPosePrompt(pose.description) });
  }
  return out;
}

async function generateOnePose({ photoBuffer, prompt }) {
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('image', new Blob([photoBuffer]), 'reference.png');
  form.append('size', '1024x1024');
  form.append('background', 'transparent');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${REAL_KEY}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`OpenAI image generation failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const b64 = data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) throw new Error('OpenAI image generation returned no image data');
  return Buffer.from(b64, 'base64');
}

module.exports = { generateCharacterPoseSet };
