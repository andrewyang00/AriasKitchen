// ===========================================================================
// assets.js — Named asset slots with automatic placeholder fallback, plus
// character-aware image resolution.
//
// HOW TO SWAP IN REAL ART:
//   Drop an illustrated PNG/WebP into assets/images/ using the filename
//   listed below for the slot you want to replace (see assets/README.md).
//   Nothing else needs to change — createAsset() tries to load the real
//   file first and only shows the pastel placeholder if it 404s.
//
// CHARACTER OVERRIDES:
//   If characters.js has set an ACTIVE_CHARACTER other than the default,
//   every image lookup tries assets/images/characters/<folder>/<file>
//   first and silently falls back to the shared assets/images/<file> (and
//   finally to the emoji placeholder) if that doesn't exist. See
//   characters.js for how a per-customer character build is configured.
// ===========================================================================

const ASSET_FILES = {
  ariaHappy: 'aria_happy.png',
  ariaExcited: 'aria_excited.png',
  ariaPouring: 'aria_pouring.png',
  ariaStirring: 'aria_stirring.png',
  ariaFlipping: 'aria_flipping.png',
  ariaCelebrating: 'aria_celebrate.png',
  eggWhole: 'egg_whole.png',
  eggCracked: 'egg_cracked.png',
  bowlEmpty: 'bowl_empty.png',
  bowlEggs: 'bowl_eggs.png',
  bowlMilk: 'bowl_milk.png',
  bowlStir1: 'bowl_milk.png',
  bowlStir2: 'bowl_batter.png',
  panEmpty: 'pan_empty.png',
  pancakeRaw: 'pancake_raw.png',
  pancakeGolden: 'pancake_golden.png',
  pancakeStack: 'pancake_stack_reward.png',
  milkCarton: 'milk_carton.png',
  spoonWooden: 'spoon_wooden.png',
  batterPour: 'batter_pour.png',
  tapIndicator: 'tap_indicator.png',
  holdIndicator: 'hold_indicator.png',
  dragIndicator: 'drag_indicator.png',
  starEmpty: 'star_empty.png',
};

// Placeholder look for each slot: an emoji glyph + pastel background tint.
// Purely cosmetic — gameplay code never checks whether a placeholder is
// showing, it only ever asks for a slot by name.
const PLACEHOLDER_LOOK = {
  ariaHappy: { glyph: '😊', tint: 'pink' },
  ariaExcited: { glyph: '🤩', tint: 'pink' },
  ariaPouring: { glyph: '🫗', tint: 'pink' },
  ariaStirring: { glyph: '🥄', tint: 'pink' },
  ariaFlipping: { glyph: '🤸', tint: 'pink' },
  ariaCelebrating: { glyph: '🥳', tint: 'pink' },
  eggWhole: { glyph: '🥚', tint: 'cream' },
  eggCracked: { glyph: '🐣', tint: 'cream' },
  bowlEmpty: { glyph: '🥣', tint: 'cream' },
  bowlEggs: { glyph: '🥣', tint: 'cream' },
  bowlMilk: { glyph: '🥛', tint: 'cream' },
  bowlStir1: { glyph: '🥣', tint: 'butter' },
  bowlStir2: { glyph: '🥣', tint: 'butter' },
  panEmpty: { glyph: '🍳', tint: 'butter' },
  pancakeRaw: { glyph: '🥞', tint: 'butter' },
  pancakeGolden: { glyph: '🥞', tint: 'golden' },
  pancakeStack: { glyph: '🥞', tint: 'golden' },
  milkCarton: { glyph: '🥛', tint: 'cream' },
  spoonWooden: { glyph: '🥄', tint: 'butter' },
  batterPour: { glyph: '🥣', tint: 'butter' },
  tapIndicator: { glyph: '👆', tint: 'pink' },
  holdIndicator: { glyph: '✋', tint: 'pink' },
  dragIndicator: { glyph: '🔄', tint: 'pink' },
  starEmpty: { glyph: '✨', tint: 'pink' },
};

/**
 * Build the ordered list of candidate URLs for an image filename: the
 * active character's own folder first (if one is set), then the shared
 * default path. loadImageWithFallback() walks this list on each error.
 */
function resolveImageCandidates(file) {
  const candidates = [];
  if (typeof ACTIVE_CHARACTER !== 'undefined' && ACTIVE_CHARACTER && ACTIVE_CHARACTER.id !== DEFAULT_CHARACTER_ID) {
    candidates.push(`assets/images/characters/${ACTIVE_CHARACTER.folder}/${file}`);
  }
  candidates.push(`assets/images/${file}`);
  return candidates;
}

/** Try each candidate URL for `file` in turn; call onAllFailed() if every one 404s. */
function loadImageWithFallback(img, file, onAllFailed) {
  const candidates = resolveImageCandidates(file);
  let i = 0;
  function tryNext() {
    if (i >= candidates.length) {
      img.removeEventListener('error', tryNext);
      if (onAllFailed) onAllFailed();
      return;
    }
    img.src = candidates[i++];
  }
  img.addEventListener('error', tryNext);
  tryNext();
}

/**
 * Build a DOM node for a named asset slot.
 *
 * Returns a <div class="asset asset-<slotName>"> that contains either:
 *   - a real <img> if assets/images/<file> loads successfully, or
 *   - a pastel placeholder (glyph + tinted rounded shape) if it doesn't.
 *
 * @param {string} slotName  one of the keys in ASSET_FILES
 * @param {{ alt?: string, extraClass?: string }} [opts]
 */
function createAsset(slotName, opts = {}) {
  const { alt = '', extraClass = '' } = opts;
  const file = ASSET_FILES[slotName];
  const look = PLACEHOLDER_LOOK[slotName] || { glyph: '🍽️', tint: 'pink' };

  const wrapper = document.createElement('div');
  wrapper.className = `asset asset-${slotName}${extraClass ? ` ${extraClass}` : ''}`;
  wrapper.dataset.slot = slotName;

  const showPlaceholder = () => {
    wrapper.classList.add('asset--placeholder', `tint-${look.tint}`);
    wrapper.textContent = look.glyph;
    wrapper.setAttribute('aria-hidden', 'true');
  };

  if (!file) {
    showPlaceholder();
    return wrapper;
  }

  const img = document.createElement('img');
  img.className = 'asset-img';
  img.alt = alt;
  img.draggable = false;
  img.decoding = 'async';
  wrapper.appendChild(img);
  loadImageWithFallback(img, file, () => {
    img.remove();
    showPlaceholder();
  });

  return wrapper;
}

/**
 * Build a scene-plate node (full illustrated background for a recipe step).
 * Same fallback philosophy as createAsset(), but returns a node meant to be
 * absolutely positioned inside a .scene-frame: a real <img class="scene-plate">
 * if `stage.file` loads, otherwise a tinted placeholder panel with a big glyph.
 *
 * @param {{ file?: string, glyph?: string, tint?: string }} stage
 * @param {{ active?: boolean, alt?: string }} [opts]
 */
function createScenePlate(stage, opts = {}) {
  const { active = false, alt = '' } = opts;
  const glyph = (stage && stage.glyph) || '🍽️';
  const tint = (stage && stage.tint) || 'pink';
  const activeClass = active ? ' scene-plate--active' : '';

  const buildPlaceholder = () => {
    const ph = document.createElement('div');
    ph.className = `scene-plate scene-plate--placeholder tint-${tint}${activeClass}`;
    ph.textContent = glyph;
    ph.setAttribute('aria-hidden', 'true');
    return ph;
  };

  if (!stage || !stage.file) {
    return buildPlaceholder();
  }

  const img = document.createElement('img');
  img.className = `scene-plate${activeClass}`;
  img.alt = alt;
  img.setAttribute('aria-hidden', 'true');
  img.draggable = false;
  img.decoding = 'async';
  loadImageWithFallback(img, stage.file, () => {
    img.replaceWith(buildPlaceholder());
  });
  return img;
}

/**
 * Swap the slot a previously-created asset node displays (e.g. bowlEmpty ->
 * bowlEggs as the recipe progresses) without rebuilding the whole element.
 */
function updateAsset(node, slotName, opts = {}) {
  const fresh = createAsset(slotName, { alt: opts.alt, extraClass: '' });
  fresh.className = node.className.replace(/\basset-[a-zA-Z0-9]+\b/g, '').trim();
  fresh.classList.add('asset', `asset-${slotName}`);
  node.replaceWith(fresh);
  return fresh;
}
