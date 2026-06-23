# Aria's Kitchen — self-serve character backend (Phase 2 skeleton)

Minimal backend behind "upload a photo, get your own in-style character in
the game." Zero npm dependencies — only Node 22 built-ins (`node:http`,
`node:sqlite`, `node:crypto`, `fs/promises`, global `fetch`/`FormData`), so
there's nothing to `npm install`. Sized for a solo operator, not a funded
startup; see the project plan for the phased rollout this fits into.

## Run it

```bash
cd backend
cp .env.example .env   # optional -- works with zero config, see MOCK MODE below
npm start
```

Listens on `http://localhost:8787` by default (`PORT` in `.env`).

## MOCK MODE (default, no API key)

With no `OPENAI_API_KEY` set:
- `generateCharacterPoseSet()` (`lib/characterGenerator.js`) returns the
  existing shipped default-character art instead of calling OpenAI, so the
  full pipeline (upload → moderate → "generate" → store → serve → render
  in-game) is runnable end-to-end with zero secrets.
- The moderation gate (`lib/moderation.js`) **fails closed**: every upload
  is held with `status: "flagged"` for manual review rather than
  auto-approved, since this product handles photos of likely-minors and
  "no moderation configured" must never silently mean "treat as safe."
  Set `MODERATION_MOCK_PASS=true` in `.env` to skip this for local testing
  only — never set it anywhere that accepts uploads from the public.

Set `OPENAI_API_KEY` in `.env` to switch both of the above to the real
OpenAI Images/Moderation APIs.

## API

- `POST /api/characters` — body `{ photoBase64, photoMimeType, childName?, consent }` (JSON, photo as base64 — chosen over multipart/form-data to avoid hand-rolling a multipart parser in a zero-dependency server). `consent` must be `true`. Returns `202 { token, status: "pending" | "flagged" }`.
- `GET /api/characters/:token` — poll job status. Returns `{ status }`, or once ready, `{ status: "ready", characterId, name, poses }`.
- `GET /characters/:token/:file` — static serving of generated pose art (e.g. `aria_happy.png`) once ready. This is exactly what `ACTIVE_CHARACTER.baseUrl` in `pancake-game/characters.js` points at.
- `POST /api/admin/characters/:token/approve` (header `x-admin-token: <ADMIN_TOKEN>`) — move a `flagged` character to `pending` so the worker picks it up, after a human has reviewed it.
- `GET /health`

## Wiring up the game client

`pancake-game/characters.js` only looks at this backend when
`window.ARIA_CHARACTER_API_BASE` is set (left empty, the game is 100%
static and unaffected). Add to `pancake-game/index.html`, before
`characters.js` loads:

```html
<script>window.ARIA_CHARACTER_API_BASE = 'http://localhost:8787';</script>
```

Then visit the game with `?character=<token>` from a completed upload.

## Try the full loop locally (mock mode)

```bash
# 1. start the backend (separate terminal)
cd backend && npm start

# 2. upload a tiny test image
TOKEN=$(node -e "
  const fs = require('fs');
  const img = fs.readFileSync('../pancake-game/assets/images/aria_happy.png');
  fetch('http://localhost:8787/api/characters', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoBase64: img.toString('base64'), photoMimeType: 'image/png', childName: 'Test', consent: true }),
  }).then((r) => r.json()).then((d) => console.log(d.token));
")
echo \"$TOKEN\"

# 3. (since mock mode flags every upload) approve it for the worker to pick up
curl -X POST http://localhost:8787/api/admin/characters/$TOKEN/approve -H "x-admin-token: change-me"

# 4. poll until status is "ready"
curl http://localhost:8787/api/characters/$TOKEN

# 5. fetch a generated pose
curl -o /tmp/pose.png http://localhost:8787/characters/$TOKEN/aria_happy.png
```

## What's deliberately out of scope here (see project plan for when)

- No accounts/auth beyond the opaque per-character token and a single
  shared `ADMIN_TOKEN` for the review endpoint.
- No real queue (Redis/SQS) — a single in-process worker polling the
  SQLite job table is enough at MVP scale.
- No cloud storage — generated art and uploaded photos live on local disk
  under `DATA_DIR` (default `./data`, gitignored).
- No background/character-layer compositing in the game itself yet — a
  generated character's poses show up on the START/SELECT screens
  immediately (same `createAsset()` path the default Aria art already
  uses), but in-scene gameplay illustrations still show the default
  character until that rendering refactor ships.
