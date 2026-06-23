// ===========================================================================
// characters.js — Character/likeness swap config.
//
// Two ways a build can show a different character than the default Aria:
//
// 1. STATIC (dev re-skin for a one-off customer order):
//    1. Duplicate assets/images/characters/aria/ into
//       assets/images/characters/<newId>/ and replace the files with the new
//       child's art, keeping the exact same filenames (same portrait slots —
//       aria_happy.png, aria_excited.png, etc. — and the same scene-plate
//       filenames as the recipe(s) you want re-illustrated — e.g.
//       scene_eggs_plate.png). Any file you DON'T replace automatically
//       falls back to the shared default art in assets/images/, so you only
//       ever need to redraw the pieces that actually show the character.
//    2. Add an entry to CHARACTERS below with the child's name.
//    3. Append ?character=<id> to the URL (or change DEFAULT_CHARACTER_ID).
//
// 2. DYNAMIC (self-serve, backend-generated — see ../backend/README.md):
//    ?character=<token> where <token> isn't a key in CHARACTERS below is
//    looked up against the self-serve backend's GET /api/characters/<token>
//    instead. If that backend isn't configured (CHARACTER_API_BASE is empty)
//    or the lookup fails for any reason, the game silently falls back to the
//    default character — it must always be playable with zero backend.
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

// Base URL of the self-serve character backend (see backend/server.js). Set
// window.ARIA_CHARACTER_API_BASE before characters.js loads (e.g. a small
// inline <script> in index.html) to point at a deployed backend. Left empty,
// dynamic/self-serve characters are simply never looked up — static
// characters and the default still work exactly as before.
const CHARACTER_API_BASE = (typeof window !== 'undefined' && window.ARIA_CHARACTER_API_BASE) || '';

function resolveActiveCharacterId() {
  try {
    const requested = new URLSearchParams(window.location.search).get('character');
    if (requested && CHARACTERS[requested]) return requested;
  } catch (err) {
    /* URLSearchParams unavailable — fall back to the default character */
  }
  return DEFAULT_CHARACTER_ID;
}

// Mutable (not const) because resolveActiveCharacterAsync() below may swap
// this out once a dynamic/self-serve lookup resolves, after script load.
let ACTIVE_CHARACTER = CHARACTERS[resolveActiveCharacterId()] || CHARACTERS[DEFAULT_CHARACTER_ID];

/**
 * If `?character=` names something other than a known static CHARACTERS id,
 * treat it as a self-serve backend token and try to resolve it. Call this
 * once at boot, before the game's state machine starts, and proceed with
 * whatever ACTIVE_CHARACTER ends up being (resolved or not) — this never
 * throws and never blocks startup beyond a normal network round trip.
 */
async function resolveActiveCharacterAsync() {
  let requested;
  try {
    requested = new URLSearchParams(window.location.search).get('character');
  } catch (err) {
    return;
  }
  if (!requested || CHARACTERS[requested] || !CHARACTER_API_BASE) return;

  try {
    const res = await fetch(`${CHARACTER_API_BASE}/api/characters/${encodeURIComponent(requested)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.status !== 'ready') return;
    ACTIVE_CHARACTER = {
      id: requested,
      name: data.name || CHARACTERS[DEFAULT_CHARACTER_ID].name,
      // resolveImageCandidates() (assets.js) prefers baseUrl over folder when set.
      baseUrl: `${CHARACTER_API_BASE}/characters/${requested}`,
    };
  } catch (err) {
    /* backend unreachable/offline — keep the default character */
  }
}
