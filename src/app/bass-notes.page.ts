import { Component, computed, signal } from '@angular/core';

// Chromatic scale anchored at E (open E string = index 0)
const NOTES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Bb: 'A#', Eb: 'D#', Ab: 'G#', Db: 'C#', Gb: 'F#', Cb: 'B', Fb: 'E',
};

// Lowest 3 bass strings, displayed top→bottom as D / A / E (standard tab order)
const STRINGS = [
  { label: 'D', open: 10 },
  { label: 'A', open: 5 },
  { label: 'E', open: 0 },
] as const;

const FRETS = 12;

const PALETTE = [
  '#00fff0', '#ff2bd6', '#ffee00', '#7fff00', '#ff6b35', '#a855f7', '#3b82f6',
] as const;

// SVG layout (all values in px, used as unitless SVG coords)
const ML = 36;      // margin-left (space for string labels)
const OPEN_W = 44;  // width of the open-string (fret 0) zone
const FRET_W = 56;  // width per fretted position (frets 1–12)
const STR_H = 56;   // vertical distance between strings
const MT = 24;      // margin-top
const MB = 36;      // margin-bottom (space for fret numbers)

const W = ML + OPEN_W + FRETS * FRET_W;       // 752 — right edge at last fret line
const SVG_W = W + 16;                          // 768 — a little breathing room on the right
const SVG_H = MT + (STRINGS.length - 1) * STR_H + MB; // 172

// Center x of a fret position (0 = open string, 1–12 = fretted)
const dotX = (f: number): number =>
  f === 0 ? ML + OPEN_W / 2 : ML + OPEN_W + (f - 0.5) * FRET_W;

// Center y of a string (0 = D on top, 2 = E on bottom)
const dotY = (si: number): number => MT + si * STR_H;

function parseRoot(chord: string): string | null {
  const m = chord.trim().match(/^([A-G][b#]?)/);
  return m ? (FLAT_TO_SHARP[m[1]] ?? m[1]) : null;
  // ponytail: slash chords (e.g. C/E) use the chord letter, not the bass note
}

interface Dot {
  x: number;
  y: number;
  color: string;
  label: string;
}

@Component({
  selector: 'app-bass-notes',
  templateUrl: './bass-notes.page.html',
  styleUrl: './bass-notes.page.scss',
})
export class BassNotesPage {
  readonly input = signal('Am G C F');

  // Unique roots in progression order, each assigned a color
  readonly chords = computed(() => {
    const map = new Map<string, { root: string; names: string[]; color: string }>();
    let ci = 0;
    for (const name of this.input().split(/[\s,]+/).filter(Boolean)) {
      const root = parseRoot(name);
      if (!root) continue;
      if (!map.has(root)) {
        map.set(root, { root, names: [], color: PALETTE[ci++ % PALETTE.length] });
      }
      map.get(root)!.names.push(name);
    }
    return [...map.values()];
  });

  // One dot per (root, string, fret) where the note matches
  readonly dots = computed((): Dot[] =>
    this.chords().flatMap(({ root, color }) =>
      STRINGS.flatMap((s, si) =>
        Array.from<unknown, Dot | null>({ length: FRETS + 1 }, (_, f) =>
          NOTES[(s.open + f) % 12] === root
            ? { x: dotX(f), y: dotY(si), color, label: root }
            : null,
        ).filter((d): d is Dot => d !== null),
      ),
    ),
  );

  // --- Precomputed SVG geometry (static, no need to be signals) ---

  readonly svgViewBox = `0 0 ${SVG_W} ${SVG_H}`;

  readonly svgStrings = STRINGS.map((s, i) => ({ label: s.label, y: dotY(i) }));

  // Fret lines: index 0 = nut (thicker), 1–12 = regular frets
  readonly svgFretLines = Array.from({ length: FRETS + 1 }, (_, i) => ({
    x: ML + OPEN_W + i * FRET_W,
    isNut: i === 0,
  }));

  readonly svgStringY1 = MT;
  readonly svgStringY2 = MT + (STRINGS.length - 1) * STR_H;
  readonly svgStringLineX2 = W; // strings end at the last fret line

  readonly svgStringLabelX = ML - 6;
  readonly svgFretNumY = SVG_H - 6;
  readonly svgFretNumbers = [0, 3, 5, 7, 9, 12].map(f => ({ x: dotX(f), label: f }));

  // Traditional fretboard position markers (●  at 3,5,7,9 and ●● at 12)
  readonly svgMarkers = [
    ...[3, 5, 7, 9].map(f => ({ cx: dotX(f), cy: MT + STR_H })),
    { cx: dotX(12), cy: MT + STR_H / 2 },
    { cx: dotX(12), cy: MT + STR_H * 1.5 },
  ];

  onInput(event: Event): void {
    this.input.set((event.target as HTMLInputElement).value);
  }
}
