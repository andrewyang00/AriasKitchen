# Little Chef Aria: Pancakes 🥞

A touch-only, no-reading-required pancake-cooking mini-game for a 3-year-old,
built as a single static web app (no backend, no build step, no paid
dependencies). Designed to be played on an iPhone in Safari, ideally added to
the Home Screen as an installable PWA.

## File structure

```
pancake-game/
├── index.html              All screens (markup), one <section class="screen"> per game state
├── styles.css              Pastel-pink, rounded, toddler-friendly styling + animations
├── app.js                  The state machine + all gameplay/interaction logic
├── audio.js                Synthesized Web Audio sound effects (no audio files)
├── assets.js               Named asset-slot system with placeholder fallback
├── assets/
│   ├── README.md           How to drop in real illustrated art (slot → filename map)
│   └── images/             Put real PNG/WebP art here (empty — placeholders used until then)
├── icons/                  PWA / home-screen icons (generated placeholder pancake mark)
├── manifest.webmanifest    PWA manifest (installable "Add to Home Screen")
└── sw.js                   Minimal offline-cache service worker
```

## How the game works

A small state machine in `app.js` drives everything:

```
START → SELECT → EGGS → MILK → STIR → BATTER → FLIP → CELEBRATE
                  ↑___________________________________│
                              (Play Again)
```

Each state has a `SETUPS[STATE]` function that wires up that screen's touch
interactions and returns a cleanup function — `goTo()` always tears the old
screen down before setting up the new one, so listeners never pile up across
replays. All progress (`game` object in `app.js`) lives in memory only —
nothing is written to localStorage/cookies, and a reload always starts fresh
at the title screen.

### Step-by-step interactions

| Step | What the child does | Feedback |
|------|---------------------|----------|
| Recipe select | Tap the glowing pancake card | Chime + the other two cards gently wobble if tapped (no fail, just "not yet!") |
| Crack 2 eggs | Tap each egg twice | 1st tap cracks (crack sound), 2nd tap drops the yolk (plop sound + animation), dots fill |
| Pour milk | Hold the milk carton | Carton tilts, pour sound loops, bowl meter fills; release pauses (never resets) |
| Stir 3 times | Drag a finger in a rough circle around the bowl | Tracks accumulated angle around the bowl center — any rough circular motion in either direction counts; spoon + dashed trail follow the finger, a soft whoosh plays each full turn, dots fill |
| Pour batter | Hold the ladle over the pan | Sizzling loop, batter pool grows; release pauses (never shrinks) |
| Flip pancake | Swipe up over the pan | A clear upward swipe flips the pancake (whoosh + golden swap); any other swipe just gives a friendly wobble — try again |
| Celebrate | — | Confetti, fanfare, finished stack, big green "play again" button loops back to recipe select |

### Design rules baked in (per the brief)

- **No fail states.** Every interaction either makes progress, pauses
  patiently, or triggers a gentle "wobble" animation + soft "boop" sound —
  see `wobble()` / `attachOffTargetWobble()` in `app.js`.
- **No reading required.** Every prompt is communicated with big emoji icons,
  motion (the nudge/swirl/swipe-hint animations), color, and sound.
- **Big, forgiving touch targets** (≥ 88px), Pointer Events for unified
  touch/mouse handling, `touch-action: none` to stop iOS scroll/zoom/bounce.
- **Counts cap at 5** (`COUNT_CAP` / `clampCount()` in `app.js`) so rapid or
  repeated taps never produce odd internal states.
- **Audio starts only after the first user gesture** — `gameAudio.unlock()`
  is called from inside the Start button's `pointerdown` handler, which is
  required for sound to work at all on iOS Safari.

## Swapping in real illustrated art

The game never hard-codes its visuals to the placeholders. Every character,
food, and prop is requested through a **named asset slot**
(`createAsset('ariaHappy', …)`, `createAsset('bowlEggs', …)`, etc. — see
`assets.js`). Each slot tries to load a real image from `assets/images/` and
*only* falls back to a styled pastel placeholder (a tinted blob + emoji) if
that file 404s.

`assets/images/` is now populated with the approved chibi-Aria / pastel-kitchen
/ glossy-food art pack (see `assets/README.md` for the full slot → filename
table — `aria_happy.png`, `bowl_eggs.png`, `pancake_golden.png`,
`pancake_stack_reward.png`, …), so the placeholders no longer appear during
normal play. Dropping in a replacement is still as simple as overwriting the
file with the matching name; no code changes are needed.

## Running locally

No build step, no dependencies to install — it's static files.

```bash
cd pancake-game
python3 -m http.server 8000
# then open http://localhost:8000/index.html on your computer
```

(Any static file server works — `npx serve`, VS Code's "Live Server", etc.
The only requirement is serving over HTTP, since `fetch`/Service Worker/
manifest don't work from `file://`.)

## Opening on an iPhone

1. Make sure your iPhone and the machine running the server are on the
   **same Wi-Fi network**.
2. Find the server machine's local IP address (e.g. `192.168.1.23`) and run
   the server as above.
3. On the iPhone, open **Safari** and go to `http://<that-ip>:8000/index.html`.
4. Tap the Share icon → **"Add to Home Screen"** to install it as a
   standalone app (uses `manifest.webmanifest` + `icons/`).
5. Launch it from the Home Screen icon — it opens full-screen with no Safari
   chrome, and the service worker (`sw.js`) caches it for offline play after
   the first visit.

### Test checklist

- [ ] Tap **Start** — you should hear a chime (confirms Web Audio unlocked
      on the very first touch, as iOS requires)
- [ ] Tap the glowing pancake card; tap a locked card to see the gentle wobble
- [ ] Tap each egg twice — crack, then drop the yolk
- [ ] Press and hold the milk carton until the bowl meter fills
- [ ] Drag a finger in a rough circle around the bowl three times
- [ ] Press and hold the ladle until the batter pool fills the pan
- [ ] Swipe up over the pan to flip the pancake golden
- [ ] Confetti + fanfare on the celebration screen; tap "Play Again" to loop
- [ ] Rotate to landscape (e.g. on iPad) — layout should reflow cleanly
