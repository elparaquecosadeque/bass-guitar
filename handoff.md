# Bass Notes — Handoff

Current state of the project as of library restructure. Intended for resuming work or handing to another contributor.

---

## What this is

A standalone Angular 22 SPA + publishable npm library (`@gblp/bass-notes`) that renders a bass guitar fretboard SVG and highlights chord root notes. Built for guitarists practicing chord progressions who want to see where the bass notes land.

---

## Repo layout

```
bass-guitar/
├── src/app/                    # demo shell — theme toggle only, imports BassNotesPage
│   ├── app.ts
│   ├── app.html
│   └── app.scss                # CSS custom properties (dark/light themes + fretboard vars)
├── projects/bass-notes/        # canonical library source
│   ├── src/lib/
│   │   ├── bass-notes.page.ts  # all logic: signals, fretboard, export, tab builder
│   │   ├── bass-notes.page.html
│   │   └── bass-notes.page.scss
│   ├── src/public-api.ts       # exports BassNotesPage
│   ├── ng-package.json         # dest: ../../dist/bass-notes
│   ├── package.json            # @gblp/bass-notes@0.1.0
│   ├── tsconfig.lib.json
│   └── tsconfig.lib.prod.json
├── tsconfig.json               # baseUrl-free paths alias: @gblp/bass-notes → ./projects/...
├── tsconfig.app.json           # same paths alias; includes projects/bass-notes/src/**
├── angular.json                # two projects: bass-guitar (app) + bass-notes (library)
├── package.json                # build / build:lib / build:gh-pages scripts
└── .github/workflows/
    ├── pages.yml               # push to main → GitHub Pages deploy
    └── publish.yml             # manual workflow_dispatch → npm publish
```

---

## Key technical decisions

### Path alias (no baseUrl)
`tsconfig.json` uses `"paths": { "@gblp/bass-notes": ["./projects/bass-notes/src/public-api.ts"] }` with a `./`-prefixed relative path — avoids the deprecated `baseUrl` option (removed in TypeScript 7). Same alias repeated in `tsconfig.app.json` so the esbuild-based Angular builder picks it up.

### Signal chain
```
input → progression → colorMap → dots
strings(showGString) ──────────→ dots
legendFilter, activeBass ──────→ dots (dimming)
selectedDots, tabBuilderMode ──→ dots (selected/tab-builder)
```

### Fretboard constants (in `bass-notes.page.ts`)
```ts
ML=36, OPEN_W=44, FRET_W=56, STR_H=56, MT=24, MB=36
W = 752, SVG_W = 768
dotX(f): fret 0 → ML + OPEN_W/2; fret f → ML + OPEN_W + (f-0.5)*FRET_W
dotY(si) = MT + si*STR_H
```

### Dot key format
`"${color}:${si}:${label}:${fret}"` — used in the `selectedDots` Set (tab builder).  
Slot prefix `"${color}:${si}:"` enforces one-dot-per-(chord × string) constraint.

### Export
- `buildExportSvg()` returns `{ svg, w, h }` — includes both fretboard and tab grid.
- PNG: SVG → Canvas 2× DPR → `toDataURL`.
- PDF: `window.print()` on a new tab with the SVG inline.
- Tab grid columns span full content width; chord names centered in header row.

### CSS fretboard variables
Defined in `src/app/app.scss` for both dark and light themes:
`--chords-nut`, `--chords-string`, `--chords-fret`, `--chords-marker`

---

## Active features

| Feature | Signal/method |
|---------|---------------|
| Slash chords | `progression` computed, regex `/\/([A-G][b#]?)$/` |
| G string toggle | `showGString` signal → `strings` computed |
| Lowest only | `lowestOnly` signal → dot filter in `dots` computed |
| Interval labels | `showIntervals` signal → dot label in computed |
| Playback | `activeBass` signal, prev/next/stop methods |
| Legend filter | `legendFilter` Set signal; click pill to toggle |
| Tab builder | `tabBuilderMode`, `selectedDots` Set signal; click dot to pick |
| Copy tab | `copyTab()` — uses selected or auto-lowest positions |
| Shareable URL | `effect()` in constructor syncs `?q=` param |
| Export PNG/PDF | `exportPng()`, `exportPdf()` |
| Color pickers | `bgColor`, `diagramColor` signals |

---

## Running locally

```bash
npm install
npm start               # http://localhost:4200
```

## Building

```bash
npm run build           # demo app → dist/bass-guitar
npm run build:lib       # library → dist/bass-notes
npm run build:gh-pages  # demo with /bass-guitar/ base href
```

---

## Publishing to npm

1. Add an `NPM_TOKEN` secret to the GitHub repo (`Settings → Secrets → Actions`).
2. Go to **Actions → Publish npm package → Run workflow**.

Or locally:
```bash
npm run build:lib
npm publish ./dist/bass-notes --access public
```

---

## GitHub Pages

Push to `main` triggers `.github/workflows/pages.yml` which builds with `build:gh-pages` and deploys to `gh-pages` branch. Live at: `https://elparaquecosadeque.github.io/bass-guitar/`

---

## Pending / next steps

See `ideas.md` for the full backlog. High-priority items not yet built:

- **Fret range selector** — window into a specific neck position (e.g. frets 5–9).
- **Scale overlay** — faint background dots for a selected key/scale.
- **Tuning presets** — drop D, BEAD, custom; recalculates all positions.
- **npm package integration into the-chords** — import `@gblp/bass-notes` in `the-chords` as a lazy-loaded route once the package is published.

---

## Integrating into the-chords

Once published to npm:

```bash
cd the-chords
npm install @gblp/bass-notes
```

Then add a lazy route:
```typescript
{ path: 'bass-notes', loadComponent: () => import('@gblp/bass-notes').then(m => m.BassNotesPage) }
```
