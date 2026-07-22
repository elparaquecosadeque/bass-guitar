# Bass Notes

Angular 22 app that visualizes chord root notes on the bass guitar fretboard.

Enter a chord progression and the app highlights every position where each root note falls on the three lowest bass strings (E, A, D) across frets 0–12.

```bash
npm install
npm start
```

## How it works

- Type any space- or comma-separated chord names: `Am G C F`, `Cmaj7 Am7 Dm7 G7`, etc.
- Each unique root is assigned a color; colored dots appear at every matching fret position on all three strings.
- Accidentals supported: both sharps (`F#`, `C#`) and flats (`Bb`, `Eb`).
- Fretboard orientation follows standard tab notation — D string on top, E string on bottom.
- Dark / light theme toggle, persisted in `localStorage`.

## Build

```bash
npm run build            # production build
npm run build:gh-pages   # production build with /bass-guitar/ base href for GitHub Pages
```

## Part of The Chords

This tool is also integrated as a lazy-loaded route in [the-chords](https://github.com/elparaquecosadeque/the-chords), alongside Chord Finder and Circle of Fifths.
