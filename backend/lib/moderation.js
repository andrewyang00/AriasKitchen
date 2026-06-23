'use strict';

const REAL_KEY = process.env.OPENAI_API_KEY;
const MOCK_PASS = process.env.MODERATION_MOCK_PASS === 'true';

const HARD_BLOCK_CATEGORIES = ['sexual/minors', 'self-harm', 'violence/graphic'];

/**
 * Moderate an image (an uploaded photo, or a freshly generated pose) before
 * it's trusted. Returns { blocked, flagged, reason }.
 *   blocked — hard stop, never store/show this image.
 *   flagged — ambiguous, hold for human review instead of auto-approving.
 *
 * FAILS CLOSED: with no OPENAI_API_KEY configured (or if the moderation API
 * call itself errors), every image comes back flagged rather than silently
 * passed. This product handles photos of likely-minors, so "no moderation
 * configured" must never be allowed to mean "treat as safe."
 * MODERATION_MOCK_PASS=true is an explicit, loudly-named escape hatch for
 * local development only — never set it anywhere that accepts uploads from
 * the public.
 */
async function moderateImage(buffer) {
  if (!REAL_KEY) {
    if (MOCK_PASS) {
      return { blocked: false, flagged: false, reason: 'mock-pass (dev only, no real moderation ran)' };
    }
    return { blocked: false, flagged: true, reason: 'no moderation provider configured' };
  }

  let res;
  try {
    res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [{ type: 'image_url', image_url: { url: `data:image/png;base64,${buffer.toString('base64')}` } }],
      }),
    });
  } catch (err) {
    return { blocked: false, flagged: true, reason: `moderation API unreachable: ${err.message}` };
  }

  if (!res.ok) {
    return { blocked: false, flagged: true, reason: `moderation API error (${res.status})` };
  }

  const data = await res.json();
  const result = data.results && data.results[0];
  if (!result) {
    return { blocked: false, flagged: true, reason: 'moderation API returned no result' };
  }

  const blocked = HARD_BLOCK_CATEGORIES.some((cat) => result.categories && result.categories[cat]);
  return {
    blocked,
    flagged: !blocked && !!result.flagged,
    reason: blocked ? 'hard-block category matched' : (result.flagged ? 'flagged for review' : null),
  };
}

module.exports = { moderateImage };
