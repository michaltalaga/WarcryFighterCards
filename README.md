# Warcry Fighter Cards SPA (MVP)

Static single-page app for printing Warcry fighter cards with fighter stats and fighter-relevant abilities on the same card.

## Scope

- No server-side runtime.
- Data is used as-is from the source repository structure.
- Browser fetches static JSON files from the public directory.

## Data Source

Source repository is cloned to:

- _warcry_data_source

Runtime static files are served from:

- public/warcry_data/data
- public/warcry_data/manifest.json

The sync script copies original data files without changing their schema:

- scripts/sync-warcry-data.ts

## Commands

- npm run dev
  - Runs data sync, then starts Vite dev server.
- npm run build
  - Runs data sync, then builds production bundle.
- npm run sync-data
  - Copies source data into public static folder and regenerates manifest.

## GitHub Pages

This repo is configured for GitHub Pages deployment via GitHub Actions:

- Workflow: `.github/workflows/deploy-pages.yml`
- Build output: `dist/`
- Vite base path is auto-derived in Actions from `GITHUB_REPOSITORY`.

To publish:

1. Create a GitHub repository (for example `WarcryFighterCards`) under your account.
2. Add remote:
  - `git remote add origin https://github.com/<your-user>/<your-repo>.git`
3. Push:
  - `git push -u origin main`
4. In GitHub repo settings, ensure Pages is configured to use `GitHub Actions`.

## MVP Features

- Warband selector generated from discovered JSON files.
- Fighter name filter and per-fighter print selection toggles.
- Printable fighter cards with:
  - Stats (Move, Toughness, Wounds, Points)
  - Weapon profiles
  - Matching abilities for that fighter based on runemarks
- Print layout optimized for 63mm x 88mm style cards.

## Key Files

- src/App.tsx
  - App logic, data loading, ability matching, rendering.
- src/App.css
  - Screen layout and print stylesheet.
- scripts/sync-warcry-data.ts
  - Static data sync and manifest generation.
