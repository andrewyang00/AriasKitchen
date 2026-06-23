'use strict';

// Placeholder until Phase 0 of the project plan (hand-comparing real
// generations against the existing aria_*.png reference art) freezes the
// actual wording. This first pass is a best-effort description of what's
// visually true of the existing art pack, not a validated prompt.
const BASE_STYLE_PROMPT = [
  "Children's storybook chibi illustration style.",
  'Big round head, oversized sparkling eyes, small simple body, soft',
  'rounded shapes, no sharp edges, flat warm pastel color palette (pinks,',
  'creams, butter yellow), thick clean outlines, glossy highlight on hair',
  'and eyes, plain background, centered, full body visible.',
].join(' ');

function buildPosePrompt(poseDescription) {
  return `${BASE_STYLE_PROMPT} Pose: ${poseDescription}.`;
}

module.exports = { BASE_STYLE_PROMPT, buildPosePrompt };
