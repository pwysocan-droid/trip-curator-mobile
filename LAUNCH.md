# LAUNCH — Trip Curator 2.0

Two parts: (1) how to run 2.0 locally and deploy it, (2) what to do about the 1.0 folder.

---

## Part 1 — Running 2.0

### Local development

From a terminal, in the folder where you unzipped this:

```bash
cd trip-curator-mobile
npm install
cp .env.example .env.local
```

Open `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The same key 1.0 uses — they're separate runtimes but the same key works for both. Then:

```bash
npm run dev
```

Open http://localhost:3000. The app is mobile-first. To preview it correctly on a desktop browser, open Chrome DevTools (Cmd-Option-I or Ctrl-Shift-I), then toggle device mode (Cmd-Shift-M or Ctrl-Shift-M) and pick a phone preset. iPhone 14 Pro / Pro Max / Pixel 7 all render correctly.

If you keep 1.0 running on port 3000, run 2.0 on a different port:

```bash
npm run dev -- -p 3001
```

### Testing on a real phone

While `npm run dev` is running, find your computer's local network IP (System Settings → Network on Mac, or `ipconfig getifaddr en0` in Terminal). Then on your phone, on the same Wi-Fi network, open `http://YOUR-IP:3000` in mobile Safari or Chrome. The image upload uses the system photo picker, which will offer the camera and library on iOS/Android automatically.

### Production build (verify before deploying)

```bash
npm run build
npm start
```

If `build` fails, that's the same failure Vercel would hit. Fix it locally first.

### Deploying to Vercel

You already have a Vercel account from 1.0 (the `.vercel/` folder existed in the original repo). Two options:

**Option A — new Vercel project for 2.0.** Recommended if you want both versions live simultaneously (e.g. 1.0 at `trips.example.com` and 2.0 at `trips-mobile.example.com`).

```bash
cd trip-curator-mobile
npx vercel
```

Follow the prompts. Choose "create new project" and name it `trip-curator-mobile`. Then add the env var:

```bash
npx vercel env add ANTHROPIC_API_KEY
```

Paste your key when prompted, select all environments. Then deploy:

```bash
npx vercel --prod
```

**Option B — push to GitHub and import in Vercel UI.** Cleaner long-term:

```bash
cd trip-curator-mobile
git init
git add .
git commit -m "Trip Curator 2.0 initial"
git remote add origin https://github.com/YOUR-USERNAME/trip-curator-mobile
git push -u origin main
```

Then in the Vercel dashboard, click "Add New → Project", import the repo, set `ANTHROPIC_API_KEY` in the environment variables step, and deploy.

---

## Part 2 — What to do about the 1.0 folder

The short answer: **keep 1.0 untouched until 2.0 is validated with real users or stakeholders.** It still works, it cost nothing to leave alone, and it's a known-good fallback.

When you're ready to clean up, here's the breakdown.

### Keep in 1.0

Even if 2.0 wins long-term, these files are useful to keep accessible somewhere:

- `CLAUDE.md`, `PROJECT_SUMMARY.md`, `README.md` — the original specification documents. They're a record of the design intent, the constraint solver logic, and the original ECAL design system. Keep these as reference even if you delete the code.
- `src/lib/utils.ts`, `src/lib/types.ts`, `src/lib/regions.ts` — these are the engine. They're already duplicated into 2.0 byte-for-byte, so technically redundant, but if you ever fork off a third version they're the canonical source.
- `public/data/*.json` — same: duplicated in 2.0, but the canonical source.
- `src/pages/api/analyze.ts` — the Anthropic prompt is real intellectual property. The exact wording of the curator prompt was iterated. Keep it.
- `scripts/fetch-unsplash-images.mjs` — utility script for refreshing mock data images. Not in 2.0; only here.

### Safe to delete from 1.0 (cruft within 1.0 itself, even before 2.0 existed)

- `src/components/TripCard.tsx` — the old version. 1.0 actively uses `TripCardV2.tsx` instead. The old file is dead code.
- `tsconfig.tsbuildinfo` — TypeScript build cache, regenerates on next compile.
- `.next/` — Next.js build output, regenerates with `npm run build`.
- `__MACOSX/` (if it appears) — macOS zip metadata, never useful.
- `.DS_Store` files anywhere in the tree — macOS folder metadata.
- `node_modules/` — regenerates with `npm install`. (357MB worth.)

### Don't delete from 1.0 (or not yet)

- `.env.local` — has your API key. If you delete 1.0 entirely later, transfer the key elsewhere first.
- `.git/` — your git history. If 1.0 is on GitHub, the remote has it; if not, deleting `.git` loses the local history permanently.
- `.vercel/` — links 1.0's local folder to its Vercel project. If you keep 1.0 deployed, leave this. If you retire the deployment, you can delete.

### When to fully retire 1.0

I'd hold off on deletion until at least one of these is true:

- 2.0 has been live in production (not just localhost) for a couple of weeks with no major regressions
- A stakeholder has signed off on the design direction
- You've copied the 1.0 specification documents (`CLAUDE.md` and `PROJECT_SUMMARY.md`) somewhere outside the folder, like a Notion page or a docs/ folder in 2.0

When all three are true, you can archive the entire 1.0 folder as a zip somewhere (Google Drive, Dropbox, a `_archive/` folder one level up) and remove it from active development. I would not recommend deleting it without an archive copy — the ECAL design language was distinctive work and may be worth revisiting.

### Recommended folder structure going forward

```
~/projects/
├── trip-curator/              ← 1.0, frozen
├── trip-curator-mobile/       ← 2.0, active
└── _archive/
    └── trip-curator-v1.zip    ← optional: zip of 1.0 once retired
```

This way both versions sit side-by-side at the filesystem level, you can run them on different ports during the transition period, and you have a clean archival path when 2.0 fully takes over.
