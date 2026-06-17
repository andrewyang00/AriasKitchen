// ===========================================================================
// characters.js — Dev-side character/likeness swap config.
//
// This is NOT a player-facing feature. Players never see a character
// chooser. It exists so the developer can re-skin the whole game (name +
// likeness) for a specific customer order without touching any other code.
//
// HOW TO RE-SKIN FOR A CUSTOM ORDER:
//   1. Duplicate assets/images/characters/aria/ into
//      assets/images/characters/<newId>/ and replace the files with the new
//      child's art, keeping the exact same filenames (same portrait slots —
//      aria_happy.png, aria_excited.png, etc. — and the same scene-plate
//      filenames as the recipe(s) you want re-illustrated — e.g.
//      scene_eggs_plate.png). Any file you DON'T replace automatically
//      falls back to the shared default art in assets/images/, so you only
//      ever need to redraw the pieces that actually show the character.
//   2. Add an entry to CHARACTERS below with the child's name.
//   3. Set ACTIVE_CHARACTER_ID to that id for the build you ship, or append
//      ?character=<id> to the URL for a quick local preview.
// ===========================================================================

const CHARACTERS = {
  aria: {
    id: 'aria',
    name: 'Aria',
    folder: 'aria',
  },
};

// The character used when no override is requested. This id's art lives at
// the flat assets/images/ paths (no characters/<id>/ subfolder needed) so
// the default build never pays for an extra network lookup.
const DEFAULT_CHARACTER_ID = 'aria';

function resolveActiveCharacterId() {
  try {
    const requested = new URLSearchParams(window.location.search).get('character');
    if (requested && CHARACTERS[requested]) return requested;
  } catch (err) {
    /* URLSearchParams unavailable — fall back to the default character */
  }
  return DEFAULT_CHARACTER_ID;
}

const ACTIVE_CHARACTER = CHARACTERS[resolveActiveCharacterId()] || CHARACTERS[DEFAULT_CHARACTER_ID];
