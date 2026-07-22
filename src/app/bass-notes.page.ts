import { Component, computed, effect, signal } from '@angular/core';

const NOTES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Bb: 'A#', Eb: 'D#', Ab: 'G#', Db: 'C#', Gb: 'F#', Cb: 'B', Fb: 'E',
};

// All 4 bass strings in tab order (high G at top → low E at bottom)
const ALL_STRINGS = [
  { label: 'G', open: 3 },
  { label: 'D', open: 10 },
  { label: 'A', open: 5 },
  { label: 'E', open: 0 },
] as const;

const FRETS = 12;

const PALETTE = [
  '#00fff0', '#ff2bd6', '#ffee00', '#7fff00', '#ff6b35', '#a855f7', '#3b82f6',
] as const;

const ML = 36, OPEN_W = 44, FRET_W = 56, STR_H = 56, MT = 24, MB = 36;
const W = ML + OPEN_W + FRETS * FRET_W;
const SVG_W = W + 16;

const dotX = (f: number): number =>
  f === 0 ? ML + OPEN_W / 2 : ML + OPEN_W + (f - 0.5) * FRET_W;
const dotY = (si: number): number => MT + si * STR_H;

function parseBassNote(chord: string): string | null {
  // Slash chord: C/E → bass note is E, not C
  const slash = chord.match(/\/([A-G][b#]?)$/);
  if (slash) return FLAT_TO_SHARP[slash[1]] ?? slash[1];
  const root = chord.match(/^([A-G][b#]?)/);
  return root ? (FLAT_TO_SHARP[root[1]] ?? root[1]) : null;
}

interface Dot {
  x: number;
  y: number;
  fret: number;
  color: string;
  label: string;
  dimmed: boolean;
  r: number;
}

@Component({
  selector: 'app-bass-notes',
  templateUrl: './bass-notes.page.html',
  styleUrl: './bass-notes.page.scss',
})
export class BassNotesPage {
  // Init from ?q= so shared URLs restore progression
  readonly input = signal(new URLSearchParams(location.search).get('q') ?? 'Am G C F');
  readonly showGString = signal(false);
  readonly lowestOnly = signal(false);
  readonly showIntervals = signal(false);
  readonly activeIdx = signal<number | null>(null);
  readonly copied = signal<'tab' | 'link' | null>(null);

  constructor() {
    // Keep ?q= in sync so the URL is always shareable
    effect(() => {
      const url = new URL(location.href);
      url.searchParams.set('q', this.input());
      history.replaceState(null, '', url);
    });
  }

  readonly strings = computed(() =>
    this.showGString() ? ALL_STRINGS : ALL_STRINGS.slice(1),
  );

  readonly progression = computed(() =>
    this.input()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(name => ({ name, bass: parseBassNote(name) }))
      .filter((c): c is { name: string; bass: string } => c.bass !== null),
  );

  readonly colorMap = computed(() => {
    const map = new Map<string, string>();
    let ci = 0;
    for (const { bass } of this.progression()) {
      if (!map.has(bass)) map.set(bass, PALETTE[ci++ % PALETTE.length]);
    }
    return map;
  });

  readonly chords = computed(() => {
    const map = new Map<string, { root: string; names: string[]; color: string }>();
    for (const { name, bass } of this.progression()) {
      if (!map.has(bass)) {
        map.set(bass, { root: bass, names: [], color: this.colorMap().get(bass)! });
      }
      map.get(bass)!.names.push(name);
    }
    return [...map.values()];
  });

  readonly activeBass = computed(() => {
    const idx = this.activeIdx();
    return idx !== null ? (this.progression()[idx]?.bass ?? null) : null;
  });

  readonly dots = computed((): Dot[] => {
    const activeBass = this.activeBass();
    const colorMap = this.colorMap();
    const strings = this.strings();
    const showIntervals = this.showIntervals();

    const dotsForNote = (
      note: string,
      color: string,
      chordsRoot: string,
      label: string,
      r: number,
    ): Dot[] =>
      strings.flatMap((s, si) =>
        Array.from<unknown, Dot | null>({ length: FRETS + 1 }, (_, f) =>
          NOTES[(s.open + f) % 12] === note
            ? {
                x: dotX(f),
                y: dotY(si),
                fret: f,
                color,
                label,
                dimmed: activeBass !== null && activeBass !== chordsRoot,
                r,
              }
            : null,
        ).filter((d): d is Dot => d !== null),
      );

    const allDots = [...colorMap.keys()].flatMap(root => {
      const color = colorMap.get(root)!;
      // When intervals are on, label root as 'R' and also show the perfect 5th
      const rootLabel = showIntervals ? 'R' : root;
      const rootDots = dotsForNote(root, color, root, rootLabel, 14);
      if (!showIntervals) return rootDots;
      const fifth = NOTES[(NOTES.indexOf(root as typeof NOTES[number]) + 7) % 12];
      return [...rootDots, ...dotsForNote(fifth, color, root, '5', 10)];
    });

    if (!this.lowestOnly()) return allDots;

    // Keep only the lowest-fret dot per (chord root, interval label)
    // Key = color:label so R and 5 of the same chord are tracked separately
    const lowestByKey = new Map<string, Dot>();
    for (const dot of allDots) {
      const key = `${dot.color}:${dot.label}`;
      const cur = lowestByKey.get(key);
      if (!cur || dot.fret < cur.fret) lowestByKey.set(key, dot);
    }
    return [...lowestByKey.values()];
  });

  // SVG geometry — recomputed when string count changes
  readonly svgGeom = computed(() => {
    const strs = this.strings();
    const h = MT + (strs.length - 1) * STR_H + MB;
    const centerY = MT + ((strs.length - 1) / 2) * STR_H;
    return {
      viewBox: `0 0 ${SVG_W} ${h}`,
      stringY2: MT + (strs.length - 1) * STR_H,
      fretNumY: h - 6,
      strings: strs.map((s, i) => ({ label: s.label, y: dotY(i) })),
      markers: [
        ...[3, 5, 7, 9].map(f => ({ cx: dotX(f), cy: centerY })),
        { cx: dotX(12), cy: centerY - STR_H / 2 },
        { cx: dotX(12), cy: centerY + STR_H / 2 },
      ],
    };
  });

  readonly svgStringLabelX = ML - 6;
  readonly svgStringLineX2 = W;
  readonly svgStringY1 = MT;
  readonly svgFretLines = Array.from({ length: FRETS + 1 }, (_, i) => ({
    x: ML + OPEN_W + i * FRET_W,
    isNut: i === 0,
  }));
  readonly svgFretNumbers = [0, 3, 5, 7, 9, 12].map(f => ({ x: dotX(f), label: f }));

  step(delta: number): void {
    const prog = this.progression();
    if (!prog.length) return;
    this.activeIdx.update(idx =>
      Math.max(0, Math.min(prog.length - 1, (idx ?? -1) + delta)),
    );
  }

  startPlayback(): void {
    if (this.progression().length) this.activeIdx.set(0);
  }

  stopPlayback(): void {
    this.activeIdx.set(null);
  }

  onInput(event: Event): void {
    this.input.set((event.target as HTMLInputElement).value);
    this.activeIdx.set(null);
  }

  copyLink(): void {
    navigator.clipboard.writeText(location.href);
    this.flashCopied('link');
  }

  copyAsTab(): void {
    const prog = this.progression();
    if (!prog.length) return;

    const strings = this.strings();
    const showIntervals = this.showIntervals();
    const COL = 5;

    const findLowest = (note: string): { si: number; fret: number } | null => {
      let lowestFret = Infinity, lowestSi = -1;
      strings.forEach((s, si) => {
        for (let f = 0; f <= FRETS; f++) {
          if (NOTES[(s.open + f) % 12] === note && f < lowestFret) {
            lowestFret = f;
            lowestSi = si;
          }
        }
      });
      return lowestSi >= 0 ? { si: lowestSi, fret: lowestFret } : null;
    };

    // Build a map of (string index → fret) per chord column
    const cols = prog.map(({ name, bass }) => {
      const positions = new Map<number, number>();
      const rootPos = findLowest(bass);
      if (rootPos) positions.set(rootPos.si, rootPos.fret);
      if (showIntervals) {
        const fifth = NOTES[(NOTES.indexOf(bass as typeof NOTES[number]) + 7) % 12];
        const fifthPos = findLowest(fifth);
        if (fifthPos) {
          const existing = positions.get(fifthPos.si);
          if (existing === undefined || fifthPos.fret < existing) {
            positions.set(fifthPos.si, fifthPos.fret);
          }
        }
      }
      return { name, positions };
    });

    const cell = (fret: number): string => {
      const s = fret.toString();
      const pad = COL - s.length;
      return '-'.repeat(Math.floor(pad / 2)) + s + '-'.repeat(pad - Math.floor(pad / 2));
    };
    const empty = '-'.repeat(COL);

    // Header row aligned with string rows (string label = 1 char + '|' = 2 chars offset)
    const header = '  ' + cols.map(c => c.name.padEnd(COL + 1)).join('');
    const rows = strings.map((s, si) =>
      `${s.label}|${cols.map(c => (c.positions.has(si) ? cell(c.positions.get(si)!) : empty)).join('|')}|`,
    );

    navigator.clipboard.writeText([header, ...rows].join('\n'));
    this.flashCopied('tab');
  }

  private flashCopied(type: 'tab' | 'link'): void {
    this.copied.set(type);
    setTimeout(() => this.copied.set(null), 2000);
  }
}

