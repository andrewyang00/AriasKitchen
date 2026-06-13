// ===========================================================================
// app.js — Little Chef Aria: Pancakes
//
// A small, explicit state machine drives the whole game:
//   START -> SELECT -> EGGS -> MILK -> STIR -> BATTER -> FLIP -> CELEBRATE
//   (Play Again from CELEBRATE goes back to SELECT)
//
// Design notes for whoever extends this:
//   - All game progress lives in the `game` object below, in memory only.
//     Nothing is persisted (no localStorage/cookies) — a fresh load always
//     starts at START, which keeps the prototype simple and predictable.
//   - Every screen has a SETUPS[STATE] function that wires up that screen's
//     interactions and returns a cleanup function. goTo() always tears down
//     the previous screen before wiring up the next one, so listeners never
//     pile up across replays.
//   - Touch handling uses Pointer Events (pointerdown/move/up/cancel) which
//     iOS Safari supports and which unify mouse + touch + pen.
//   - There are NO fail states. Every interaction either makes progress,
//     waits patiently, or triggers a friendly "wobble" + boop sound.
// ===========================================================================

(function () {
  'use strict';

  // ---- tunable gameplay constants ---------------------------------------
  const STIR_TARGET = 3;            // full swirls needed (brief: "stir 3 times")
  const MILK_HOLD_SECONDS = 2.0;    // how long to hold to fill the bowl
  const BATTER_HOLD_SECONDS = 1.8;  // how long to hold to grow the pancake
  const SWIPE_UP_THRESHOLD = 56;    // px of upward motion that counts as "swipe up"
  const COUNT_CAP = 5;              // brief: "Counts cap at 5"
  const STEP_ORDER = ['EGGS', 'MILK', 'STIR', 'BATTER', 'FLIP', 'CELEBRATE'];

  const clampCount = (n) => Math.min(n, COUNT_CAP);

  // ---- in-memory game state (no localStorage, resets on reload/replay) --
  const game = {
    eggStage: [0, 0],   // per egg: 0 = whole, 1 = cracked, 2 = emptied into bowl
    milkFill: 0,        // 0..1
    stirTurns: 0,       // completed rough revolutions
    batterSize: 0,      // 0..1
    flipped: false,
  };

  function resetGame() {
    game.eggStage = [0, 0];
    game.milkFill = 0;
    game.stirTurns = 0;
    game.batterSize = 0;
    game.flipped = false;
  }

  // ---- screen registry + state machine -----------------------------------
  const screens = {};
  document.querySelectorAll('.screen').forEach((el) => {
    screens[el.dataset.screen] = el;
  });
  const appEl = document.getElementById('app');

  const SETUPS = {};      // STATE -> () => cleanupFn | undefined
  let currentState = null;
  let currentCleanup = null;

  function goTo(nextState) {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (currentState) {
      screens[currentState].classList.remove('is-active');
    }
    currentState = nextState;
    appEl.dataset.screen = nextState;
    screens[nextState].classList.add('is-active');
    renderStepPips(screens[nextState], nextState);
    const setup = SETUPS[nextState];
    currentCleanup = setup ? setup() || null : null;
  }

  // ---- small DOM helpers --------------------------------------------------

  /** Clear a container and mount a named asset slot inside it. Returns the container. */
  function mountAsset(containerId, slotName, alt) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.appendChild(createAsset(slotName, { alt }));
    return container;
  }

  /** Build N empty progress dots inside a container; returns the dot elements. */
  function buildDots(containerId, total) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const dots = [];
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.className = 'dot';
      container.appendChild(dot);
      dots.push(dot);
    }
    return dots;
  }

  function setDots(dots, filledCount) {
    dots.forEach((dot, i) => dot.classList.toggle('is-filled', i < filledCount));
  }

  function renderStepPips(screenEl, state) {
    const holder = screenEl.querySelector('.step-pips');
    if (!holder) return;
    const activeIndex = STEP_ORDER.indexOf(state);
    holder.innerHTML = '';
    STEP_ORDER.forEach((_, i) => {
      const pip = document.createElement('span');
      pip.className = 'step-pip';
      pip.classList.toggle('is-filled', i <= activeIndex);
      holder.appendChild(pip);
    });
  }

  /**
   * Pointer capture keeps a hold/drag/swipe gesture tracking an element even
   * if the finger slides off it — but it can throw if the browser doesn't
   * consider the pointer "active" (e.g. certain edge cases around very fast
   * taps). Capture is a nice-to-have for robustness, not a requirement, so
   * we never let it block the gesture itself.
   */
  function safeSetPointerCapture(el, pointerId) {
    try { el.setPointerCapture(pointerId); } catch (err) { /* ignore */ }
  }

  /** Restart the gentle "wobble" animation on an element and play its sound. */
  function wobble(el) {
    if (!el) return;
    el.classList.remove('wobble');
    void el.offsetWidth; // force reflow so the animation can replay
    el.classList.add('wobble');
    gameAudio.playBoop();
  }

  /**
   * Wobble `wobbleTarget` whenever the player taps somewhere on `screenEl`
   * that isn't one of the screen's real interactive controls. This is what
   * makes "off-target taps gently wobble, never fail" work everywhere.
   */
  function attachOffTargetWobble(screenEl, interactiveSelector, wobbleTarget) {
    const handler = (e) => {
      if (e.target.closest(interactiveSelector)) return;
      wobble(wobbleTarget);
    };
    screenEl.addEventListener('pointerdown', handler);
    return () => screenEl.removeEventListener('pointerdown', handler);
  }

  function attachOffTargetHint(screenEl, interactiveSelector, hintTargets) {
    const handler = (e) => {
      if (e.target.closest(interactiveSelector)) return;
      gameAudio.playBoop();
      hintTargets().forEach((target) => {
        target.classList.remove('egg-hint');
        void target.offsetWidth;
        target.classList.add('egg-hint');
      });
    };
    screenEl.addEventListener('pointerdown', handler);
    return () => screenEl.removeEventListener('pointerdown', handler);
  }

  function setupChromeButtons() {
    const homeButton = document.querySelector('.round-nav--home');
    const soundButton = document.querySelector('.round-nav--sound');

    homeButton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      gameAudio.playChime();
      resetGame();
      goTo('SELECT');
    });

    soundButton.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      gameAudio.playBoop();
      wobble(soundButton);
    });
  }

  // =========================================================================
  // START — title screen. The very first tap unlocks Web Audio (required by
  // iOS Safari) and plays the first sound.
  // =========================================================================
  SETUPS.START = function () {
    mountAsset('ariaStart', 'ariaHappy', 'Aria smiling');
    const button = document.getElementById('startButton');
    let started = false;

    function onStart(e) {
      e.preventDefault();
      if (started) return;
      started = true;
      gameAudio.unlock();   // <- must happen inside a user gesture for iOS
      gameAudio.playChime();
      goTo('SELECT');
    }

    button.addEventListener('pointerdown', onStart);
    return () => button.removeEventListener('pointerdown', onStart);
  };

  // =========================================================================
  // SELECT — recipe picker. Only Pancakes is playable; the other two cards
  // are friendly "coming soon" placeholders that wobble when tapped.
  // =========================================================================
  SETUPS.SELECT = function () {
    mountAsset('ariaSelect', 'ariaHappy', 'Aria smiling');
    const pancakeCard = document.getElementById('recipePancakes');
    const lockedCards = Array.from(document.querySelectorAll('.recipe-card--locked'));

    function onPickPancakes(e) {
      e.preventDefault();
      gameAudio.playChime();
      resetGame();
      goTo('EGGS');
    }
    function onPickLocked(e) {
      e.preventDefault();
      wobble(e.currentTarget);
    }

    pancakeCard.addEventListener('pointerdown', onPickPancakes);
    lockedCards.forEach((card) => card.addEventListener('pointerdown', onPickLocked));

    const offTarget = attachOffTargetWobble(screens.SELECT, '.recipe-card', document.getElementById('ariaSelect'));

    return () => {
      pancakeCard.removeEventListener('pointerdown', onPickPancakes);
      lockedCards.forEach((card) => card.removeEventListener('pointerdown', onPickLocked));
      offTarget();
    };
  };

  // =========================================================================
  // EGGS — tap each egg twice: first tap cracks it, second tap drops the
  // yolk into the bowl. Two eggs done -> auto-advance to MILK.
  // =========================================================================
  SETUPS.EGGS = function () {
    const dots = buildDots('dotsEggs', 2);
    setDots(dots, 0);

    const eggRow = document.getElementById('eggRow');
    eggRow.innerHTML = '';
    const eggs = [];

    for (let i = 0; i < 2; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'egg grounded-shadow';
      button.setAttribute('aria-label', 'Egg — tap twice to crack it');
      const assetNode = createAsset('eggWhole', { alt: 'Whole egg', extraClass: 'egg-glyph' });
      const yolk = document.createElement('div');
      yolk.className = 'egg-yolk';
      button.append(assetNode, yolk);
      eggRow.appendChild(button);

      const eggData = { el: button, assetNode, stage: 0 };
      eggs.push(eggData);

      const onTap = (e) => {
        e.preventDefault();
        crackEgg(eggData);
      };
      button.addEventListener('pointerdown', onTap);
      eggData._cleanup = () => button.removeEventListener('pointerdown', onTap);
    }

    function crackEgg(eggData) {
      if (eggData.stage >= 2) return; // already finished — ignore extra taps
      eggData.stage += 1;

      if (eggData.stage === 1) {
        eggData.el.classList.add('is-cracked-1');
        eggData.assetNode = updateAsset(eggData.assetNode, 'eggCracked', { alt: 'Cracked egg' });
        gameAudio.playCrack();
      } else {
        eggData.el.classList.add('is-done');
        gameAudio.playPlop();
        const doneCount = eggs.filter((e) => e.stage >= 2).length;
        setDots(dots, doneCount);
        if (doneCount === 2) {
          gameAudio.playStepComplete();
          setTimeout(() => goTo('MILK'), 900);
        }
      }
    }

    const offTarget = attachOffTargetHint(screens.EGGS, '.egg', () => eggs.filter((egg) => egg.stage < 2).map((egg) => egg.el));

    return () => {
      eggs.forEach((eggData) => eggData._cleanup());
      offTarget();
    };
  };

  // =========================================================================
  // MILK — hold the carton; the bowl meter fills while held and pauses
  // (never resets) if released early. Full meter -> auto-advance to STIR.
  // =========================================================================
  SETUPS.MILK = function () {
    const carton = document.getElementById('milkCarton');
    const scene = carton.closest('.scene-frame');
    const fillBar = document.getElementById('milkFillBar');
    fillBar.style.height = `${Math.round(game.milkFill * 100)}%`;

    let holding = false;
    let advanced = false;
    let rafId = null;
    let lastTime = null;
    let stopPour = null;

    function tick(time) {
      if (!holding) return;
      if (lastTime == null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      game.milkFill = Math.min(1, game.milkFill + dt / MILK_HOLD_SECONDS);
      fillBar.style.height = `${Math.round(game.milkFill * 100)}%`;

      if (game.milkFill >= 1 && !advanced) {
        advanced = true;
        stopHolding();
        gameAudio.playStepComplete();
        setTimeout(() => goTo('STIR'), 850);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function startHolding() {
      if (advanced || holding) return;
      holding = true;
      lastTime = null;
      carton.classList.add('is-holding');
      scene.classList.add('is-holding');
      stopPour = gameAudio.playPourLoop();
      rafId = requestAnimationFrame(tick);
    }

    function stopHolding() {
      if (!holding) return;
      holding = false;
      carton.classList.remove('is-holding');
      scene.classList.remove('is-holding');
      if (rafId) cancelAnimationFrame(rafId);
      if (stopPour) { stopPour(); stopPour = null; }
    }

    function onPointerDown(e) {
      e.preventDefault();
      if (!advanced) safeSetPointerCapture(scene, e.pointerId);
      startHolding();
    }
    function onPointerUp() { stopHolding(); }

    scene.addEventListener('pointerdown', onPointerDown);
    scene.addEventListener('pointerup', onPointerUp);
    scene.addEventListener('pointercancel', onPointerUp);
    scene.addEventListener('pointerleave', onPointerUp);

    return () => {
      stopHolding();
      scene.removeEventListener('pointerdown', onPointerDown);
      scene.removeEventListener('pointerup', onPointerUp);
      scene.removeEventListener('pointercancel', onPointerUp);
      scene.removeEventListener('pointerleave', onPointerUp);
    };
  };

  // =========================================================================
  // STIR — drag a finger in a rough circle around the bowl. We track the
  // running angle around the bowl's center and count a "turn" whenever the
  // accumulated angle passes a full revolution (in either direction — this
  // is meant to detect *rough* circular motion, not a precise, one-way
  // circle). Need STIR_TARGET turns to move on.
  // =========================================================================
  SETUPS.STIR = function () {
    const surface = document.getElementById('stirSurface');
    const trail = document.getElementById('swirlTrail');
    const spoon = document.getElementById('swirlSpoon');
    const dots = buildDots('dotsStir', STIR_TARGET);
    setDots(dots, 0);

    const DEAD_ZONE_FRAC = 0.16; // ignore motion too close to the center (jitter)
    let pointerId = null;
    let lastAngle = null;
    let accumAngle = 0;
    let turns = 0;
    let advanced = false;

    function bowlGeometry() {
      const rect = surface.getBoundingClientRect();
      return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        radius: Math.min(rect.width, rect.height) / 2,
        rect,
      };
    }

    function placeSpoon(clientX, clientY, rect) {
      spoon.style.left = `${clientX - rect.left}px`;
      spoon.style.top = `${clientY - rect.top}px`;
    }

    function onPointerDown(e) {
      e.preventDefault();
      if (advanced) return;
      pointerId = e.pointerId;
      safeSetPointerCapture(surface, pointerId);
      const geo = bowlGeometry();
      const dist = Math.hypot(e.clientX - geo.cx, e.clientY - geo.cy);
      lastAngle = dist > geo.radius * DEAD_ZONE_FRAC
        ? Math.atan2(e.clientY - geo.cy, e.clientX - geo.cx)
        : null;
      accumAngle = 0;
      surface.classList.add('is-stirring');
      trail.classList.add('is-active');
      spoon.classList.add('is-visible');
      placeSpoon(e.clientX, e.clientY, geo.rect);
    }

    function onPointerMove(e) {
      if (e.pointerId !== pointerId || advanced) return;
      const geo = bowlGeometry();
      placeSpoon(e.clientX, e.clientY, geo.rect);

      const dist = Math.hypot(e.clientX - geo.cx, e.clientY - geo.cy);
      if (dist < geo.radius * DEAD_ZONE_FRAC) {
        lastAngle = null; // too close to center — wait until they swing back out
        return;
      }
      const angle = Math.atan2(e.clientY - geo.cy, e.clientX - geo.cx);
      if (lastAngle != null) {
        let delta = angle - lastAngle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        accumAngle += delta;
        if (Math.abs(accumAngle) >= Math.PI * 2) {
          accumAngle -= Math.sign(accumAngle) * Math.PI * 2;
          registerTurn();
        }
      }
      lastAngle = angle;
    }

    function registerTurn() {
      turns = clampCount(turns + 1);
      game.stirTurns = turns;
      gameAudio.playSwirl();
      setDots(dots, Math.min(turns, STIR_TARGET));

      if (turns >= STIR_TARGET && !advanced) {
        advanced = true;
        gameAudio.playStepComplete();
        endStroke();
        setTimeout(() => goTo('BATTER'), 850);
      }
    }

    function endStroke() {
      pointerId = null;
      lastAngle = null;
      accumAngle = 0;
      surface.classList.remove('is-stirring');
      trail.classList.remove('is-active');
      spoon.classList.remove('is-visible');
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      endStroke();
    }

    surface.addEventListener('pointerdown', onPointerDown);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerup', onPointerUp);
    surface.addEventListener('pointercancel', onPointerUp);

    return () => {
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerup', onPointerUp);
      surface.removeEventListener('pointercancel', onPointerUp);
    };
  };

  // =========================================================================
  // BATTER — hold the ladle over the pan; the batter pool grows while held
  // and pauses (never shrinks) if released early. Full size -> FLIP.
  // =========================================================================
  SETUPS.BATTER = function () {
    const ladle = document.getElementById('batterLadle');
    const scene = ladle.closest('.scene-frame');
    const fillBar = document.getElementById('batterFillBar');

    function applyPoolSize() {
      fillBar.style.height = `${Math.round(game.batterSize * 100)}%`;
    }
    applyPoolSize();

    let holding = false;
    let advanced = false;
    let rafId = null;
    let lastTime = null;
    let stopSizzle = null;

    function tick(time) {
      if (!holding) return;
      if (lastTime == null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      game.batterSize = Math.min(1, game.batterSize + dt / BATTER_HOLD_SECONDS);
      applyPoolSize();

      if (game.batterSize >= 1 && !advanced) {
        advanced = true;
        stopHolding();
        gameAudio.playStepComplete();
        setTimeout(() => goTo('FLIP'), 850);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function startHolding() {
      if (advanced || holding) return;
      holding = true;
      lastTime = null;
      ladle.classList.add('is-holding');
      scene.classList.add('is-holding');
      stopSizzle = gameAudio.playSizzleLoop();
      rafId = requestAnimationFrame(tick);
    }
    function stopHolding() {
      if (!holding) return;
      holding = false;
      ladle.classList.remove('is-holding');
      scene.classList.remove('is-holding');
      if (rafId) cancelAnimationFrame(rafId);
      if (stopSizzle) { stopSizzle(); stopSizzle = null; }
    }

    function onPointerDown(e) {
      e.preventDefault();
      if (!advanced) safeSetPointerCapture(scene, e.pointerId);
      startHolding();
    }
    function onPointerUp() { stopHolding(); }

    scene.addEventListener('pointerdown', onPointerDown);
    scene.addEventListener('pointerup', onPointerUp);
    scene.addEventListener('pointercancel', onPointerUp);
    scene.addEventListener('pointerleave', onPointerUp);

    return () => {
      stopHolding();
      scene.removeEventListener('pointerdown', onPointerDown);
      scene.removeEventListener('pointerup', onPointerUp);
      scene.removeEventListener('pointercancel', onPointerUp);
      scene.removeEventListener('pointerleave', onPointerUp);
    };
  };

  // =========================================================================
  // FLIP — swipe up over the pan to flip the pancake from raw to golden.
  // A swipe that isn't "up enough" just gives a gentle wobble — try again.
  // =========================================================================
  SETUPS.FLIP = function () {
    const wrap = document.getElementById('flipPanWrap');
    const hint = document.getElementById('swipeHint');

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let attempts = 0;
    let advanced = false;

    function onPointerDown(e) {
      e.preventDefault();
      if (advanced) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      safeSetPointerCapture(wrap, pointerId);
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (advanced) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      attempts = clampCount(attempts + 1);

      if (dy <= -SWIPE_UP_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        doFlip();
      } else {
        wobble(wrap);
      }
    }

    function onPointerCancel(e) {
      if (e.pointerId === pointerId) pointerId = null;
    }

    function doFlip() {
      advanced = true;
      game.flipped = true;
      hint.style.opacity = '0';
      gameAudio.playFlipWhoosh();
      wrap.classList.add('is-flipping');

      setTimeout(() => {
        gameAudio.playStepComplete();
      }, 320);
      setTimeout(() => wrap.classList.remove('is-flipping'), 650);
      setTimeout(() => goTo('CELEBRATE'), 1650);
    }

    wrap.addEventListener('pointerdown', onPointerDown);
    wrap.addEventListener('pointerup', onPointerUp);
    wrap.addEventListener('pointercancel', onPointerCancel);

    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown);
      wrap.removeEventListener('pointerup', onPointerUp);
      wrap.removeEventListener('pointercancel', onPointerCancel);
    };
  };

  // =========================================================================
  // CELEBRATE — confetti, fanfare, finished pancake stack, and a big
  // friendly "play again" button that loops back to recipe select.
  // =========================================================================
  SETUPS.CELEBRATE = function () {
    const field = document.getElementById('confettiField');
    const playAgain = document.getElementById('playAgainButton');

    field.innerHTML = '';
    const glyphs = ['🎉', '🎊', '⭐', '✨', '🥞', '💗'];
    for (let i = 0; i < 18; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.textContent = glyphs[i % glyphs.length];
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.setProperty('--drift', `${Math.round((Math.random() * 2 - 1) * 80)}px`);
      piece.style.animationDuration = `${(2.4 + Math.random() * 1.6).toFixed(2)}s`;
      piece.style.animationDelay = `${(Math.random() * 1.2).toFixed(2)}s`;
      field.appendChild(piece);
    }

    gameAudio.playFanfare();

    function onPlayAgain(e) {
      e.preventDefault();
      gameAudio.playChime();
      resetGame();
      goTo('SELECT');
    }
    playAgain.addEventListener('pointerdown', onPlayAgain);

    return () => {
      playAgain.removeEventListener('pointerdown', onPlayAgain);
      field.innerHTML = '';
    };
  };

  // ---- boot ---------------------------------------------------------------
  setupChromeButtons();
  goTo('START');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is best-effort */ });
    });
  }
})();
