// ===========================================================================
// assets.js — Named asset slots with automatic placeholder fallback.
//
// HOW TO SWAP IN REAL ART:
//   Drop an illustrated PNG/WebP into assets/images/ using the filename
//   listed below for the slot you want to replace (see assets/README.md).
//   Nothing else needs to change — createAsset() tries to load the real
//   file first and only shows the pastel placeholder if it 404s.
// ===========================================================================

const ASSET_FILES = {
  ariaHappy: 'aria_happy.png',
  ariaExcited: 'aria_excited.png',
  ariaFocused: 'aria_focused.png',
  ariaCelebrating: 'aria_celebrating.png',
  eggWhole: 'egg_whole.png',
  eggCracked: 'egg_cracked.png',
  bowlEmpty: 'bowl_empty.png',
  bowlEggs: 'bowl_eggs.png',
  bowlMilk: 'bowl_milk.png',
  bowlStir1: 'bowl_stir_1.png',
  bowlStir2: 'bowl_stir_2.png',
  panRaw: 'pan_raw.png',
  panGolden: 'pan_golden.png',
  pancakeStack: 'pancake_stack.png',
};

// Placeholder look for each slot: an emoji glyph + pastel background tint.
// Purely cosmetic — gameplay code never checks whether a placeholder is
// showing, it only ever asks for a slot by name.
const PLACEHOLDER_LOOK = {
  ariaHappy: { glyph: '😊', tint: 'pink' },
  ariaExcited: { glyph: '🤩', tint: 'pink' },
  ariaFocused: { glyph: '🤔', tint: 'pink' },
  ariaCelebrating: { glyph: '🥳', tint: 'pink' },
  eggWhole: { glyph: '🥚', tint: 'cream' },
  eggCracked: { glyph: '🐣', tint: 'cream' },
  bowlEmpty: { glyph: '🥣', tint: 'cream' },
  bowlEggs: { glyph: '🥣', tint: 'cream' },
  bowlMilk: { glyph: '🥛', tint: 'cream' },
  bowlStir1: { glyph: '🥣', tint: 'butter' },
  bowlStir2: { glyph: '🥣', tint: 'butter' },
  panRaw: { glyph: '🍳', tint: 'butter' },
  panGolden: { glyph: '🥞', tint: 'golden' },
  pancakeStack: { glyph: '🥞', tint: 'golden' },
};

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
  img.src = `assets/images/${file}`;
  img.alt = alt;
  img.draggable = false;
  img.decoding = 'async';
  img.addEventListener('error', () => {
    img.remove();
    showPlaceholder();
  }, { once: true });
  wrapper.appendChild(img);

  return wrapper;
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
