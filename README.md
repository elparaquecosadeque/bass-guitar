# Bass Notes

Angular 22 app that visualizes chord root notes on a bass guitar fretboard. Enter a chord progression and colored dots appear at every position each root occupies on the E, A, D (and optionally G) strings across frets 0–12.

Also published as **`@gblp/bass-notes`** — an Angular component you can drop into any Angular 22+ app.

---

## Demo

Deployed to GitHub Pages: [`https://elparaquecosadeque.github.io/bass-guitar/`](https://elparaquecosadeque.github.io/bass-guitar/)

---

## Quick start

```bash
npm install
npm start
```

---

## Features

| Feature | Description |
|---------|-------------|
| Chord input | Space- or comma-separated chord names: `Am G C F`, `Cmaj7 Am7 Dm7 G7` |
| Slash chords | `C/E` places the dot on E — useful for descending bass lines |
| Accidentals | Both sharps (`F#`, `C#`) and flats (`Bb`, `Eb`) normalized automatically |
| G string toggle | Show 3 (E A D) or 4 (E A D G) bass strings |
| Lowest only | Toggle to show just the closest root to the nut per chord |
| Interval labels | Show `R`, `5`, `8` inside dots instead of the note letter |
| Playback | Prev / Next / Stop to step through chords; active chord highlighted, others dimmed |
| Legend filter | Click a chord pill in the legend to solo/dim specific roots |
| Tab builder | Click dots on the fretboard to pick exactly which positions go into your tab |
| Copy as tab | Export the current (or picked) positions as ASCII tab |
| Export | Download fretboard as PNG or PDF; custom diagram and background colors |
| Shareable URL | Chord progression encoded in `?q=` — just copy the address bar |
| Themes | Dark / light toggle, persisted in `localStorage` |
| Mobile hint | Landscape nudge on small screens |

---

## Scripts

```bash
npm start                # dev server
npm run build            # production build of the demo app
npm run build:lib        # build @gblp/bass-notes to dist/bass-notes
npm run publish:lib      # build + publish to npm (prompts for login if needed)
npm run build:gh-pages   # demo build with /bass-guitar/ base href (GitHub Pages)
```

---

## Using as a library

Install from npm:

```bash
npm install @gblp/bass-notes
```

Import the standalone component:

```typescript
import { BassNotesPage } from '@gblp/bass-notes';

@Component({
  imports: [BassNotesPage],
  template: `<bass-notes-page />`
})
export class AppComponent {}
```

Peer dependencies: `@angular/common` and `@angular/core` `^22.0.0`.

---

## Publishing

Publish is manual via GitHub Actions (`workflow_dispatch`). Add an `NPM_TOKEN` secret to the repo, then trigger the **Publish npm package** workflow from the Actions tab.

Or publish directly from your terminal — no token setup needed, just an npm account:

```bash
npm login                # one-time — prompts for username, password, OTP
npm run publish:lib      # builds the library then publishes to npm
```

`npm login` stores credentials locally so subsequent publishes skip the prompt.

---

## Project structure

```
bass-guitar/
├── src/app/                    # demo shell app
│   ├── app.ts                  # root component (theme toggle)
│   └── app.scss                # CSS custom properties for both themes
├── projects/bass-notes/        # publishable library
│   ├── src/lib/
│   │   ├── bass-notes.page.ts  # component (signals, fretboard logic, export)
│   │   ├── bass-notes.page.html
│   │   └── bass-notes.page.scss
│   ├── src/public-api.ts       # exports BassNotesPage
│   ├── ng-package.json
│   └── package.json            # @gblp/bass-notes
└── .github/workflows/
    ├── pages.yml               # GitHub Pages deploy
    └── publish.yml             # npm publish (manual)
```

---

## Part of The Chords ecosystem

Bass Notes is designed to integrate with [the-chords](https://github.com/elparaquecosadeque/the-chords) via the `@gblp/bass-notes` npm package, alongside Chord Finder and Circle of Fifths.
