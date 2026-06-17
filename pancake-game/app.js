// ===========================================================================
// app.js — Aria's Kitchen: generic recipe engine.
//
// One small state machine drives three screens: START -> SELECT -> STEP.
// STEP is a single reusable shell rendered fresh for every step of whatever
// recipe the player picked, using recipes.js data and one of six reusable
// mechanic handlers (tapCounter, holdFill, dragCircle, swipeGesture,
// smearCoverage, colorMatch) plus a celebrate finale. Adding a new recipe
// never touches this file — it only ever reads RECIPES.
//
// Design notes:
//   - All game progress lives in memory only (no persistence) — a fresh
//     load always starts at START.
//   - Touch handling uses Pointer Events (pointerdown/move/up/cancel).
//   - There are NO fail states. Every interaction either makes progress,
//     waits patiently, or triggers a friendly "wobble" + boop sound.
// ===========================================================================

(function () {
  'use strict';

  const COUNT_CAP = 5; // counts cap at 5, same brief as the original pancakes-only build
  const clampCount = (n) => Math.min(n, COUNT_CAP);

  const game = {
    recipe: null,
    stepIndex: 0,
  };

  function resetGame() {
    game.recipe = null;
    game.stepIndex = 0;
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
    const setup = SETUPS[nextState];
    currentCleanup = setup ? setup() || null : null;
  }

  // ---- small DOM helpers --------------------------------------------------

  function mountAsset(containerId, slotName, alt) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.appendChild(createAsset(slotName, { alt }));
    return container;
  }

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

  function renderStepPips(total, activeIndex) {
    const holder = document.getElementById('stepPips');
    holder.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const pip = document.createElement('span');
      pip.className = 'step-pip';
      pip.classList.toggle('is-filled', i <= activeIndex);
      holder.appendChild(pip);
    }
  }

  function safeSetPointerCapture(el, pointerId) {
    try { el.setPointerCapture(pointerId); } catch (err) { /* ignore */ }
  }

  function wobble(el) {
    if (!el) return;
    el.classList.remove('wobble');
    void el.offsetWidth; // force reflow so the animation can replay
    el.classList.add('wobble');
    gameAudio.playBoop();
  }

  function attachOffTargetWobble(screenEl, interactiveSelector, wobbleTarget) {
    const handler = (e) => {
      if (e.target.closest(interactiveSelector)) return;
      wobble(typeof wobbleTarget === 'function' ? wobbleTarget() : wobbleTarget);
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

  function applyCharacterName() {
    const name = ACTIVE_CHARACTER.name;
    document.querySelectorAll('[data-char-name]').forEach((el) => { el.textContent = name; });
    document.title = `${name}'s Kitchen`;
    const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (metaTitle) metaTitle.setAttribute('content', `${name} Kitchen`);
  }

  // =========================================================================
  // START
  // =========================================================================
  SETUPS.START = function () {
    mountAsset('ariaStart', 'ariaHappy', `${ACTIVE_CHARACTER.name} smiling`);
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
  // SELECT — recipe picker, built fresh from RECIPES every visit.
  // =========================================================================
  SETUPS.SELECT = function () {
    mountAsset('ariaSelect', 'ariaHappy', `${ACTIVE_CHARACTER.name} smiling`);
    const grid = document.getElementById('recipeGrid');
    grid.innerHTML = '';

    const cards = RECIPE_ORDER.map((id) => {
      const recipe = RECIPES[id];
      const card = document.createElement('button');
      card.className = 'recipe-card';
      card.type = 'button';
      card.dataset.recipe = id;
      card.setAttribute('aria-label', `Make ${recipe.name}`);

      const art = document.createElement('div');
      art.className = `recipe-card-art tint-${recipe.cardArt.tint}`;
      art.textContent = recipe.cardArt.glyph;
      art.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.textContent = recipe.name;

      const badge = document.createElement('b');
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = 'Start';

      card.append(art, label, badge);
      grid.appendChild(card);
      return card;
    });

    function onPick(e) {
      e.preventDefault();
      const id = e.currentTarget.dataset.recipe;
      gameAudio.playChime();
      resetGame();
      game.recipe = RECIPES[id];
      game.stepIndex = 0;
      goTo('STEP');
    }
    cards.forEach((card) => card.addEventListener('pointerdown', onPick));

    const offTarget = attachOffTargetWobble(screens.SELECT, '.recipe-card', () => document.getElementById('ariaSelect'));

    return () => {
      cards.forEach((card) => card.removeEventListener('pointerdown', onPick));
      offTarget();
    };
  };

  // =========================================================================
  // STEP — one reusable shell for every step of every recipe. Rebuilds the
  // header/scene/footer from the current recipe's step data, wires up the
  // mechanic this step uses, and advances to the next step (or loops back
  // to SELECT, for the celebrate finale) on completion.
  // =========================================================================

  const INDICATOR_SLOT = {
    tapCounter: 'tapIndicator',
    holdFill: 'holdIndicator',
    dragCircle: 'dragIndicator',
    swipeGesture: 'dragIndicator',
    smearCoverage: 'dragIndicator',
    colorMatch: 'tapIndicator',
  };

  const MECHANICS = {}; // mechanicName -> (sceneFrame, step, onComplete) => cleanupFn

  function advanceStep() {
    game.stepIndex += 1;
    if (currentCleanup) { currentCleanup(); currentCleanup = null; }
    currentCleanup = buildStepScreen() || null;
  }

  SETUPS.STEP = function () {
    return buildStepScreen();
  };

  function buildStepScreen() {
    const recipe = game.recipe;
    const step = recipe.steps[game.stepIndex];
    const total = recipe.steps.length;

    document.getElementById('stepBadge').textContent = String(game.stepIndex + 1);
    document.getElementById('stepEyebrow').textContent = step.eyebrow || '';
    document.getElementById('stepTitle').textContent = step.title || '';
    renderStepPips(total, game.stepIndex);

    const stage = document.getElementById('stepStage');
    stage.innerHTML = '';

    const footer = document.getElementById('stepActionStrip');
    const indicator = document.getElementById('stepIndicator');
    const hint = document.getElementById('stepHint');
    const dotsHolder = document.getElementById('stepDots');
    indicator.innerHTML = '';
    dotsHolder.innerHTML = '';

    if (step.mechanic === 'celebrate') {
      footer.style.display = 'none';
      return buildCelebrateStage(stage, step);
    }

    footer.style.display = '';
    const indicatorSlot = INDICATOR_SLOT[step.mechanic];
    if (indicatorSlot) indicator.appendChild(createAsset(indicatorSlot, { alt: '' }));
    hint.textContent = step.hint || '';

    const sceneFrame = document.createElement('div');
    sceneFrame.className = 'scene-frame';
    if (step.mechanic === 'dragCircle' || step.mechanic === 'smearCoverage') {
      sceneFrame.classList.add('scene-frame--drag');
    }
    stage.appendChild(sceneFrame);

    const scene = step.scene || {};
    if (scene.idle) sceneFrame.appendChild(createScenePlate(scene.idle, { active: false, alt: '' }));
    if (scene.active) sceneFrame.appendChild(createScenePlate(scene.active, { active: true, alt: '' }));

    applyLayout(sceneFrame, step.layout);

    const handler = MECHANICS[step.mechanic];
    const onComplete = () => {
      gameAudio.playStepComplete();
      setTimeout(advanceStep, 850);
    };
    const mechanicCleanup = handler ? handler(sceneFrame, step, onComplete, dotsHolder) : null;

    return () => {
      if (mechanicCleanup) mechanicCleanup();
    };
  }

  // ---- layout: optional recipe-supplied CSS custom-property overrides ----

  const LAYOUT_VAR_MAP = {
    hotspot: { left: '--hs-left', top: '--hs-top', width: '--hs-width', height: '--hs-height' },
    meter: { right: '--meter-right', top: '--meter-top', width: '--meter-width', height: '--meter-height' },
    items: { left: '--items-left', bottom: '--items-bottom', gap: '--items-gap' },
    trail: { inset: '--trail-inset' },
    motion: { left: '--motion-left', top: '--motion-top', width: '--motion-width' },
    hint: { right: '--hint-right', top: '--hint-top', width: '--hint-width' },
    panel: { left: '--panel-left', bottom: '--panel-bottom', width: '--panel-width' },
    canvas: { left: '--canvas-left', top: '--canvas-top', width: '--canvas-width', height: '--canvas-height' },
  };

  function applyLayout(sceneFrame, layout) {
    if (!layout) return;
    Object.entries(layout).forEach(([groupKey, props]) => {
      const varMap = LAYOUT_VAR_MAP[groupKey];
      if (!varMap) return;
      Object.entries(props).forEach(([propKey, val]) => {
        const cssVar = varMap[propKey];
        if (!cssVar) return;
        sceneFrame.style.setProperty(cssVar, typeof val === 'number' ? `${val}%` : val);
      });
    });
  }

  // =========================================================================
  // tapCounter — tap each of N items M times (eggs, scoops, cheese, herbs...)
  // =========================================================================
  MECHANICS.tapCounter = function (sceneFrame, step, onComplete, dotsHolder) {
    const { items, tapsPerItem, layout = 'row', stages, itemGlyph, itemTint, sfx = {} } = step.params;

    const container = document.createElement('div');
    container.className = `scene-items scene-items--${layout}`;
    sceneFrame.appendChild(container);

    const useDots = items > 1;
    const dots = buildDots('stepDots', useDots ? items : tapsPerItem);
    setDots(dots, 0);

    const tokens = [];
    for (let i = 0; i < items; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'scene-item grounded-shadow';
      button.setAttribute('aria-label', `Tap ${tapsPerItem > 1 ? tapsPerItem + ' times' : ''}`);

      if (layout === 'scatter') {
        const x = 14 + Math.random() * 72;
        const y = 16 + Math.random() * 56;
        button.style.setProperty('--item-x', `${x}%`);
        button.style.setProperty('--item-y', `${y}%`);
      }

      let assetNode = null;
      if (stages && stages.length) {
        assetNode = createAsset(stages[0].slot, { alt: '', extraClass: 'egg-glyph' });
        button.appendChild(assetNode);
        if (tapsPerItem > 1) {
          const token = document.createElement('div');
          token.className = 'item-token';
          button.appendChild(token);
        }
      } else {
        const glyph = document.createElement('span');
        glyph.className = `item-glyph${itemTint ? ` tint-${itemTint}` : ''}`;
        glyph.textContent = itemGlyph || '🍽️';
        button.appendChild(glyph);
      }

      container.appendChild(button);
      const data = { el: button, assetNode, taps: 0 };
      tokens.push(data);
    }

    function onTapItem(data) {
      if (data.taps >= tapsPerItem) return;
      data.taps += 1;

      const isLast = data.taps >= tapsPerItem;
      if (data.assetNode && stages && stages.length > 1) {
        const stageIndex = Math.min(data.taps, stages.length - 1);
        data.assetNode = updateAsset(data.assetNode, stages[stageIndex].slot, { alt: '' });
      }
      data.el.classList.toggle('is-stage-1', !isLast && data.taps >= 1);
      data.el.classList.toggle('is-done', isLast);

      if (isLast && sfx.lastTap) gameAudio[sfx.lastTap]();
      else if (sfx.tap) gameAudio[sfx.tap]();

      if (useDots) {
        const doneCount = tokens.filter((t) => t.taps >= tapsPerItem).length;
        setDots(dots, doneCount);
        if (doneCount === items) onComplete();
      } else {
        setDots(dots, data.taps);
        if (data.taps >= tapsPerItem) onComplete();
      }
    }

    const listeners = tokens.map((data) => {
      const fn = (e) => { e.preventDefault(); onTapItem(data); };
      data.el.addEventListener('pointerdown', fn);
      return fn;
    });

    const offTarget = attachOffTargetHint(sceneFrame, '.scene-item', () =>
      tokens.filter((t) => t.taps < tapsPerItem).map((t) => t.el));

    return () => {
      tokens.forEach((data, i) => data.el.removeEventListener('pointerdown', listeners[i]));
      offTarget();
    };
  };

  // =========================================================================
  // holdFill — hold a hotspot; a meter fills and pauses (never resets) if
  // released early (milk, batter, broth, bake, simmer, lime...).
  // =========================================================================
  MECHANICS.holdFill = function (sceneFrame, step, onComplete) {
    const { holdSeconds, sfx = {}, meterTint } = step.params;

    const hotspot = document.createElement('button');
    hotspot.type = 'button';
    hotspot.className = 'scene-hotspot';
    hotspot.setAttribute('aria-label', step.hint || 'Hold');
    const ring = document.createElement('span');
    ring.className = 'hold-ring';
    ring.setAttribute('aria-hidden', 'true');
    hotspot.appendChild(ring);
    sceneFrame.appendChild(hotspot);

    const meter = document.createElement('div');
    meter.className = 'fill-meter';
    meter.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('div');
    bar.className = `fill-meter-bar${meterTint === 'butter' ? ' fill-meter-bar--butter' : ''}`;
    meter.appendChild(bar);
    sceneFrame.appendChild(meter);

    let fill = 0;
    let holding = false;
    let advanced = false;
    let rafId = null;
    let lastTime = null;
    let stopLoop = null;

    function applyFill() { bar.style.height = `${Math.round(fill * 100)}%`; }

    function tick(time) {
      if (!holding) return;
      if (lastTime == null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      fill = Math.min(1, fill + dt / holdSeconds);
      applyFill();

      if (fill >= 1 && !advanced) {
        advanced = true;
        stopHolding();
        onComplete();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function startHolding() {
      if (advanced || holding) return;
      holding = true;
      lastTime = null;
      hotspot.classList.add('is-holding');
      sceneFrame.classList.add('is-engaged');
      if (sfx.loop) stopLoop = gameAudio[sfx.loop]();
      rafId = requestAnimationFrame(tick);
    }

    function stopHolding() {
      if (!holding) return;
      holding = false;
      hotspot.classList.remove('is-holding');
      sceneFrame.classList.remove('is-engaged');
      if (rafId) cancelAnimationFrame(rafId);
      if (stopLoop) { stopLoop(); stopLoop = null; }
    }

    function onPointerDown(e) {
      e.preventDefault();
      if (!advanced) safeSetPointerCapture(sceneFrame, e.pointerId);
      startHolding();
    }
    function onPointerUp() { stopHolding(); }

    sceneFrame.addEventListener('pointerdown', onPointerDown);
    sceneFrame.addEventListener('pointerup', onPointerUp);
    sceneFrame.addEventListener('pointercancel', onPointerUp);
    sceneFrame.addEventListener('pointerleave', onPointerUp);

    return () => {
      stopHolding();
      sceneFrame.removeEventListener('pointerdown', onPointerDown);
      sceneFrame.removeEventListener('pointerup', onPointerUp);
      sceneFrame.removeEventListener('pointercancel', onPointerUp);
      sceneFrame.removeEventListener('pointerleave', onPointerUp);
    };
  };

  // =========================================================================
  // dragCircle — swirl a finger in a rough circle around the scene (stir,
  // knead, swirl whipped cream...). Counts a "turn" every full revolution.
  // =========================================================================
  MECHANICS.dragCircle = function (sceneFrame, step, onComplete) {
    const { turns, sfx = {}, spoon, glyph } = step.params;
    const DEAD_ZONE_FRAC = 0.16;

    const motion = document.createElement('div');
    motion.className = 'stir-motion';
    motion.setAttribute('aria-hidden', 'true');
    sceneFrame.appendChild(motion);

    const trail = document.createElement('div');
    trail.className = 'swirl-trail';
    trail.setAttribute('aria-hidden', 'true');
    sceneFrame.appendChild(trail);

    const tool = document.createElement(spoon && spoon.slot ? 'div' : 'span');
    tool.className = 'swirl-spoon';
    tool.setAttribute('aria-hidden', 'true');
    if (spoon && spoon.slot) {
      tool.appendChild(createAsset(spoon.slot, { alt: '' }));
    } else {
      tool.textContent = glyph || '🥄';
    }
    sceneFrame.appendChild(tool);

    const dots = buildDots('stepDots', turns);
    setDots(dots, 0);

    let pointerId = null;
    let lastAngle = null;
    let accumAngle = 0;
    let turnCount = 0;
    let advanced = false;

    function geometry() {
      const rect = sceneFrame.getBoundingClientRect();
      return {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        radius: Math.min(rect.width, rect.height) / 2,
        rect,
      };
    }

    function placeTool(clientX, clientY, rect) {
      tool.style.left = `${clientX - rect.left}px`;
      tool.style.top = `${clientY - rect.top}px`;
    }

    function onPointerDown(e) {
      e.preventDefault();
      if (advanced) return;
      pointerId = e.pointerId;
      safeSetPointerCapture(sceneFrame, pointerId);
      const geo = geometry();
      const dist = Math.hypot(e.clientX - geo.cx, e.clientY - geo.cy);
      lastAngle = dist > geo.radius * DEAD_ZONE_FRAC
        ? Math.atan2(e.clientY - geo.cy, e.clientX - geo.cx)
        : null;
      accumAngle = 0;
      sceneFrame.classList.add('is-engaged');
      trail.classList.add('is-active');
      tool.classList.add('is-visible');
      placeTool(e.clientX, e.clientY, geo.rect);
    }

    function onPointerMove(e) {
      if (e.pointerId !== pointerId || advanced) return;
      const geo = geometry();
      placeTool(e.clientX, e.clientY, geo.rect);

      const dist = Math.hypot(e.clientX - geo.cx, e.clientY - geo.cy);
      if (dist < geo.radius * DEAD_ZONE_FRAC) {
        lastAngle = null;
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
      turnCount = clampCount(turnCount + 1);
      if (sfx.turn) gameAudio[sfx.turn]();
      setDots(dots, Math.min(turnCount, turns));

      if (turnCount >= turns && !advanced) {
        advanced = true;
        endStroke();
        onComplete();
      }
    }

    function endStroke() {
      pointerId = null;
      lastAngle = null;
      accumAngle = 0;
      sceneFrame.classList.remove('is-engaged');
      trail.classList.remove('is-active');
      tool.classList.remove('is-visible');
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      endStroke();
    }

    sceneFrame.addEventListener('pointerdown', onPointerDown);
    sceneFrame.addEventListener('pointermove', onPointerMove);
    sceneFrame.addEventListener('pointerup', onPointerUp);
    sceneFrame.addEventListener('pointercancel', onPointerUp);

    return () => {
      sceneFrame.removeEventListener('pointerdown', onPointerDown);
      sceneFrame.removeEventListener('pointermove', onPointerMove);
      sceneFrame.removeEventListener('pointerup', onPointerUp);
      sceneFrame.removeEventListener('pointercancel', onPointerUp);
    };
  };

  // =========================================================================
  // swipeGesture — swipe in a direction to flip/lift/pop. A swipe that isn't
  // decisive enough just gives a gentle wobble — try again.
  // =========================================================================
  function checkSwipe(dx, dy, direction, threshold) {
    if (direction === 'down') return dy >= threshold && Math.abs(dy) > Math.abs(dx);
    if (direction === 'left') return dx <= -threshold && Math.abs(dx) > Math.abs(dy);
    if (direction === 'right') return dx >= threshold && Math.abs(dx) > Math.abs(dy);
    return dy <= -threshold && Math.abs(dy) > Math.abs(dx); // 'up' default
  }

  MECHANICS.swipeGesture = function (sceneFrame, step, onComplete) {
    const { direction = 'up', threshold = 56, label = 'Up', sfx = {} } = step.params;

    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.textContent = label;
    hint.setAttribute('aria-hidden', 'true');
    sceneFrame.appendChild(hint);

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let advanced = false;

    function onPointerDown(e) {
      e.preventDefault();
      if (advanced) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      safeSetPointerCapture(sceneFrame, pointerId);
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (advanced) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (checkSwipe(dx, dy, direction, threshold)) {
        advanced = true;
        if (sfx.gesture) gameAudio[sfx.gesture]();
        hint.style.opacity = '0';
        sceneFrame.classList.add('is-engaged');
        setTimeout(onComplete, 500);
      } else {
        wobble(sceneFrame);
      }
    }

    function onPointerCancel(e) {
      if (e.pointerId === pointerId) pointerId = null;
    }

    sceneFrame.addEventListener('pointerdown', onPointerDown);
    sceneFrame.addEventListener('pointerup', onPointerUp);
    sceneFrame.addEventListener('pointercancel', onPointerCancel);

    return () => {
      sceneFrame.removeEventListener('pointerdown', onPointerDown);
      sceneFrame.removeEventListener('pointerup', onPointerUp);
      sceneFrame.removeEventListener('pointercancel', onPointerCancel);
    };
  };

  // =========================================================================
  // smearCoverage — drag to paint a color over the scene until enough of it
  // is covered (spreading sauce, frosting, sprinkling...). This is the
  // "coloring" mechanic.
  // =========================================================================
  MECHANICS.smearCoverage = function (sceneFrame, step, onComplete) {
    const { threshold = 0.75, color = '#ff9fc2', sfx = {} } = step.params;

    const canvas = document.createElement('canvas');
    canvas.className = 'smear-canvas';
    sceneFrame.appendChild(canvas);

    const progress = document.createElement('div');
    progress.className = 'smear-progress';
    progress.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('div');
    bar.className = 'smear-progress-bar';
    progress.appendChild(bar);
    sceneFrame.appendChild(progress);

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || 1;
    const cssH = rect.height || 1;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    ctx.scale(dpr, dpr);

    const BRUSH_RADIUS = Math.max(18, Math.min(cssW, cssH) * 0.09);
    let pointerId = null;
    let lastX = null;
    let lastY = null;
    let advanced = false;
    let sampleScheduled = false;

    function paintDot(x, y) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    function paintStroke(x0, y0, x1, y1) {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(1, Math.ceil(dist / (BRUSH_RADIUS * 0.5)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        paintDot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      }
    }

    function scheduleSample() {
      if (sampleScheduled || advanced) return;
      sampleScheduled = true;
      setTimeout(() => {
        sampleScheduled = false;
        sampleCoverage();
      }, 120);
    }

    function sampleCoverage() {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const stride = 4 * 4; // sample every 4th pixel for speed
      let painted = 0;
      let total = 0;
      for (let i = 3; i < data.length; i += stride) {
        total += 1;
        if (data[i] > 40) painted += 1;
      }
      const coverage = total ? painted / total : 0;
      bar.style.width = `${Math.min(100, Math.round((coverage / threshold) * 100))}%`;

      if (coverage >= threshold && !advanced) {
        advanced = true;
        onComplete();
      }
    }

    function toCanvasPoint(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onPointerDown(e) {
      e.preventDefault();
      if (advanced) return;
      pointerId = e.pointerId;
      safeSetPointerCapture(canvas, pointerId);
      const p = toCanvasPoint(e);
      lastX = p.x; lastY = p.y;
      paintDot(p.x, p.y);
      if (sfx.stroke) gameAudio[sfx.stroke]();
      scheduleSample();
    }

    function onPointerMove(e) {
      if (e.pointerId !== pointerId || advanced) return;
      const p = toCanvasPoint(e);
      paintStroke(lastX, lastY, p.x, p.y);
      lastX = p.x; lastY = p.y;
      scheduleSample();
    }

    function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  };

  // =========================================================================
  // colorMatch — tap the swatch that matches the prompt color, round after
  // round. This is the "matching colors" mechanic.
  // =========================================================================
  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  MECHANICS.colorMatch = function (sceneFrame, step, onComplete, dotsHolder) {
    const { rounds, sfx = {} } = step.params;

    const panel = document.createElement('div');
    panel.className = 'colormatch-panel';
    sceneFrame.appendChild(panel);

    const prompt = document.createElement('div');
    prompt.className = 'colormatch-prompt';
    const promptSwatch = document.createElement('span');
    promptSwatch.className = 'colormatch-prompt-swatch';
    const promptLabel = document.createElement('span');
    prompt.append(promptSwatch, promptLabel);
    panel.appendChild(prompt);

    const optionsRow = document.createElement('div');
    optionsRow.className = 'colormatch-options';
    panel.appendChild(optionsRow);

    const palette = shuffled(rounds);
    const dots = buildDots('stepDots', rounds.length);
    setDots(dots, 0);

    let roundIndex = 0;
    let advanced = false;
    let optionButtons = [];
    let optionListeners = [];

    function clearOptions() {
      optionButtons.forEach((btn, i) => btn.removeEventListener('pointerdown', optionListeners[i]));
      optionsRow.innerHTML = '';
      optionButtons = [];
      optionListeners = [];
    }

    function renderRound() {
      const target = rounds[roundIndex];
      promptSwatch.style.background = target.color;
      promptLabel.textContent = `Match the ${target.label}`;

      clearOptions();
      shuffled(palette).forEach((opt) => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'colormatch-swatch';
        swatch.style.background = opt.color;
        swatch.setAttribute('aria-label', opt.label);
        const onPick = (e) => {
          e.preventDefault();
          if (advanced) return;
          if (opt.color === target.color) {
            if (sfx.correct) gameAudio[sfx.correct]();
            roundIndex += 1;
            setDots(dots, roundIndex);
            if (roundIndex >= rounds.length) {
              advanced = true;
              clearOptions();
              onComplete();
            } else {
              renderRound();
            }
          } else {
            if (sfx.wrong) gameAudio[sfx.wrong]();
            wobble(swatch);
          }
        };
        swatch.addEventListener('pointerdown', onPick);
        optionButtons.push(swatch);
        optionListeners.push(onPick);
        optionsRow.appendChild(swatch);
      });
    }

    renderRound();

    return () => { clearOptions(); };
  };

  // =========================================================================
  // celebrate — confetti, fanfare, the finished dish, and Play Again.
  // =========================================================================
  function buildCelebrateStage(stage, step) {
    const { rewardGlyph, rewardTint = 'pink', rewardLabel = 'Yum!', rewardSlot } = step.params;

    const celebrateStage = document.createElement('div');
    celebrateStage.className = 'celebrate-stage';
    stage.appendChild(celebrateStage);

    const sceneFrame = document.createElement('div');
    sceneFrame.className = 'scene-frame scene-frame--celebrate';
    celebrateStage.appendChild(sceneFrame);

    const scene = step.scene || {};
    if (scene.idle) sceneFrame.appendChild(createScenePlate(scene.idle, { active: false, alt: '' }));

    const badge = document.createElement('div');
    badge.className = 'reward-badge';
    if (rewardSlot) {
      badge.appendChild(createAsset(rewardSlot, { alt: rewardLabel }));
    } else {
      badge.classList.add('asset--placeholder', `tint-${rewardTint}`);
      badge.textContent = rewardGlyph || '🎉';
      badge.setAttribute('aria-hidden', 'true');
    }
    sceneFrame.appendChild(badge);

    const congrats = document.createElement('div');
    congrats.className = 'counter-congrats';
    const stars = document.createElement('div');
    stars.className = 'stars';
    stars.setAttribute('aria-hidden', 'true');
    const label = document.createElement('p');
    label.className = 'reward-label';
    label.textContent = rewardLabel;
    const playAgain = document.createElement('button');
    playAgain.type = 'button';
    playAgain.className = 'big-button big-button--again';
    playAgain.id = 'playAgainButton';
    playAgain.setAttribute('aria-label', 'Play again');
    const playAgainSpan = document.createElement('span');
    playAgainSpan.setAttribute('aria-hidden', 'true');
    playAgainSpan.textContent = 'Play again';
    playAgain.appendChild(playAgainSpan);
    congrats.append(stars, label, playAgain);
    sceneFrame.appendChild(congrats);

    const field = document.createElement('div');
    field.className = 'confetti-field';
    field.setAttribute('aria-hidden', 'true');
    celebrateStage.appendChild(field);

    const glyphs = ['🎉', '🎊', '⭐', '✨', rewardGlyph || '🎉', '💗'];
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
    };
  }

  // ---- boot ---------------------------------------------------------------
  applyCharacterName();
  setupChromeButtons();
  goTo('START');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is best-effort */ });
    });
  }
})();
