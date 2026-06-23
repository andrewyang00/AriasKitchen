'use strict';

// The pose set every character (default Aria, dev re-skins, and self-serve
// generated characters alike) needs today. Filenames intentionally match
// the existing ASSET_FILES portrait slots in pancake-game/assets.js exactly
// (aria_happy.png, aria_excited.png, ...) so a generated character is usable
// immediately via the existing createAsset()/resolveImageCandidates() path
// on the START/SELECT screens, with zero frontend rendering changes beyond
// the baseUrl wiring already added to characters.js/assets.js. In-scene
// gameplay illustrations still show the default character's baked-in art
// until the background/character-layering refactor (see project plan)
// ships -- this pose set is forward-compatible with that: it just gains a
// couple more generic entries (e.g. "spreading", "choosing") then.
const POSES = {
  happy: {
    file: 'aria_happy.png',
    description: 'standing relaxed with a warm smile, hands clasped in front',
  },
  excited: {
    file: 'aria_excited.png',
    description: 'both arms raised, big open-mouth smile, leaning forward',
  },
  pouring: {
    file: 'aria_pouring.png',
    description: 'tilting a carton forward with both hands, focused expression',
  },
  stirring: {
    file: 'aria_stirring.png',
    description: 'one arm extended holding a spoon mid-stir, slight forward lean',
  },
  flipping: {
    file: 'aria_flipping.png',
    description: 'mid-hop with one arm flung upward, joyful surprised expression',
  },
  celebrate: {
    file: 'aria_celebrate.png',
    description: 'both arms up in a cheer, big grin, confetti-ready energy',
  },
};

module.exports = { POSES };
