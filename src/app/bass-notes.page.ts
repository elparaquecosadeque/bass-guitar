import { Component, computed, effect, signal } from '@angular/core';

const NOTES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Bb: 'A#', Eb: 'D#', Ab: 'G#', Db: 'C#', Gb: 'F#', Cb: 'B', Fb: 'E',
};

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

// Stable key for a dot — used by both selection Set and the constraint check
const dotKey = (color: string, si: number, label: string, fret: number): string =>
  `${color}:${si}:${label}:${fret}`;

// Slot key: one dot allowed per (chord-root × string) in the tab
const slotPrefix = (color: string, si: number): string => `${color}:${si}:`;

function parseBassNote(chord: string): string | null {
  const slash = chord.match(/\/([A-G][b#]?)$/);
  if (slash) return FLAT_TO_SHARP[slash[1]] ?? slash[1];
  const root = chord.match(/^([A-G][b#]?)/);
  return root ? (FLAT_TO_SHARP[root[1]] ?? root[1]) : null;
}

interface Dot {
  x: number;
  y: number;
  si: number;
  fret: number;
  color: string;
  label: string;
  dimmed: boolean;
  selected: boolean;
  r: number;
}

@Component({
  selector: 'app-bass-notes',
  templateUrl: './bass-notes.page.html',
  styleUrl: './bass-notes.page.scss',
})
export class BassNotesPage {
  readonly input = signal(new URLSearchParams(location.search).get('q') ?? 'Am G C F');
  readonly showGString = signal(false);
  readonly lowestOnly = signal(false);
  readonly showIntervals = signal(false);
  readonly activeIdx = signal<number | null>(null);
  readonly copied = signal<'tab' | 'link' | null>(null);

  // Legend filter: set of root notes to "solo" on the fretboard
  readonly legendFilter = signal(new Set<string>());

  // Tab builder: click dots to pick positions for Copy tab
  readonly tabBuilderMode = signal(false);
  readonly selectedDots = signal(new Set<string>());

  // Export panel
  readonly exportPanelOpen = signal(false);
  readonly exportBgColor = signal('#ffffff');
  readonly exportLineColor = signal('#000000');
  readonly exportTransparent = signal(false);

  constructor() {
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
    const legendFilter = this.legendFilter();
    const colorMap = this.colorMap();
    const strings = this.strings();
    const showIntervals = this.showIntervals();
    const selectedDots = this.selectedDots();
    const tabBuilderMode = this.tabBuilderMode();

    // Priority: playback > legend filter > none
    const isDimmed = (chordsRoot: string): boolean => {
      if (activeBass !== null) return activeBass !== chordsRoot;
      if (legendFilter.size > 0) return !legendFilter.has(chordsRoot);
      return false;
    };

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
                si,
                fret: f,
                color,
                label,
                dimmed: isDimmed(chordsRoot),
                selected: tabBuilderMode && selectedDots.has(dotKey(color, si, label, f)),
                r,
              }
            : null,
        ).filter((d): d is Dot => d !== null),
      );

    const allDots = [...colorMap.keys()].flatMap(root => {
      const color = colorMap.get(root)!;
      const rootLabel = showIntervals ? 'R' : root;
      const rootDots = dotsForNote(root, color, root, rootLabel, 14);
      if (!showIntervals) return rootDots;
      const fifth = NOTES[(NOTES.indexOf(root as typeof NOTES[number]) + 7) % 12];
      return [...rootDots, ...dotsForNote(fifth, color, root, '5', 10)];
    });

    if (!this.lowestOnly()) return allDots;

    const lowestByKey = new Map<string, Dot>();
    for (const dot of allDots) {
      const key = `${dot.color}:${dot.label}`;
      const cur = lowestByKey.get(key);
      if (!cur || dot.fret < cur.fret) lowestByKey.set(key, dot);
    }
    return [...lowestByKey.values()];
  });

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

  // ── Legend filter ─────────────────────────────────────────────────────────

  toggleLegendFilter(root: string): void {
    this.legendFilter.update(f => {
      const next = new Set(f);
      next.has(root) ? next.delete(root) : next.add(root);
      return next;
    });
  }

  clearLegendFilter(): void {
    this.legendFilter.set(new Set());
  }

  // ── Tab builder ───────────────────────────────────────────────────────────

  toggleDotSelection(dot: Dot): void {
    if (!this.tabBuilderMode()) return;
    const key = dotKey(dot.color, dot.si, dot.label, dot.fret);
    const prefix = slotPrefix(dot.color, dot.si);
    this.selectedDots.update(sel => {
      const next = new Set(sel);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Enforce one dot per chord × string slot
        for (const k of [...next]) {
          if (k.startsWith(prefix)) next.delete(k);
        }
        next.add(key);
      }
      return next;
    });
  }

  clearSelection(): void {
    this.selectedDots.set(new Set());
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  step(delta: number): void {
    const prog = this.progression();
    if (!prog.length) return;
    this.activeIdx.update(idx =>
      Math.max(0, Math.min(prog.length - 1, (idx ?? -1) + delta)),
    );
  }

  startPlayback(): void {
    if (!this.progression().length) return;
    this.legendFilter.set(new Set()); // playback overrides legend filter
    this.activeIdx.set(0);
  }

  stopPlayback(): void {
    this.activeIdx.set(null);
  }

  onInput(event: Event): void {
    this.input.set((event.target as HTMLInputElement).value);
    this.activeIdx.set(null);
    this.legendFilter.set(new Set());
    this.selectedDots.set(new Set());
  }

  // ── Copy actions ──────────────────────────────────────────────────────────

  copyLink(): void {
    navigator.clipboard.writeText(location.href);
    this.flashCopied('link');
  }

  copyAsTab(): void {
    const prog = this.progression();
    if (!prog.length) return;

    const strings = this.strings();
    const COL = 5;
    const cols = prog.map(({ name, bass }) => ({
      name,
      positions: this.getTabPositions(bass),
    }));

    const cell = (fret: number): string => {
      const s = fret.toString(), pad = COL - s.length;
      return '-'.repeat(Math.floor(pad / 2)) + s + '-'.repeat(pad - Math.floor(pad / 2));
    };
    const empty = '-'.repeat(COL);
    const header = '  ' + cols.map(c => c.name.padEnd(COL + 1)).join('');
    const rows = strings.map((s, si) =>
      `${s.label}|${cols.map(c => (c.positions.has(si) ? cell(c.positions.get(si)!) : empty)).join('|')}|`,
    );

    navigator.clipboard.writeText([header, ...rows].join('\n'));
    this.flashCopied('tab');
  }

  // Returns (stringIndex → fret) for one chord: selected positions when tab builder
  // is active and that chord has selections, otherwise auto-lowest
  private getTabPositions(bass: string): Map<number, number> {
    const color = this.colorMap().get(bass)!;
    const sel = this.selectedDots();

    if (this.tabBuilderMode() && sel.size > 0) {
      const positions = new Map<number, number>();
      const prefix = color + ':';
      for (const key of sel) {
        if (!key.startsWith(prefix)) continue;
        const parts = key.split(':'); // color:si:label:fret
        positions.set(parseInt(parts[1]), parseInt(parts[3]));
      }
      if (positions.size > 0) return positions;
      // No selection for this chord → fall through to auto-lowest
    }

    return this.findLowestPositions(bass);
  }

  private findLowestPositions(bass: string): Map<number, number> {
    const strings = this.strings();
    const showIntervals = this.showIntervals();
    const positions = new Map<number, number>();

    const findLowest = (note: string): { si: number; fret: number } | null => {
      let lf = Infinity, ls = -1;
      strings.forEach((s, si) => {
        for (let f = 0; f <= FRETS; f++) {
          if (NOTES[(s.open + f) % 12] === note && f < lf) { lf = f; ls = si; }
        }
      });
      return ls >= 0 ? { si: ls, fret: lf } : null;
    };

    const rp = findLowest(bass);
    if (rp) positions.set(rp.si, rp.fret);

    if (showIntervals) {
      const fifth = NOTES[(NOTES.indexOf(bass as typeof NOTES[number]) + 7) % 12];
      const fp = findLowest(fifth);
      if (fp) {
        const existing = positions.get(fp.si);
        if (existing === undefined || fp.fret < existing) positions.set(fp.si, fp.fret);
      }
    }

    return positions;
  }

  private flashCopied(type: 'tab' | 'link'): void {
    this.copied.set(type);
    setTimeout(() => this.copied.set(null), 2000);
  }

  // ── Export ────────────────────────────────────────────────────────────────

  toggleExportPanel(): void {
    this.exportPanelOpen.update(v => !v);
  }

  async exportPng(): Promise<void> {
    const dataUrl = await this.renderToDataUrl(
      this.exportLineColor(), this.exportBgColor(), this.exportTransparent(),
    );
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'bass-notes.png';
    a.click();
  }

  async exportPdf(): Promise<void> {
    // PDF always uses default colors per spec (black lines, white bg)
    const dataUrl = await this.renderToDataUrl('#000000', '#ffffff', false);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>Bass Notes</title>` +
      `<style>@page{size:auto;margin:8mm}body{margin:0;background:#fff}img{width:100%;display:block}</style></head>` +
      `<body><img src="${dataUrl}"/></body></html>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  private buildExportSvg(fg: string, bg: string, transparent: boolean): { svg: string; w: number; h: number } {
    const geom = this.svgGeom();
    const [, , svgW, fbH] = geom.viewBox.split(' ').map(Number);
    const strs = this.strings();
    const prog = this.progression();
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // ── Tab grid layout ───────────────────────────────────────────────────────
    const cols = prog.map(({ name, bass }) => ({ name, pos: this.getTabPositions(bass) }));
    const n = cols.length;

    // Tab content area — inset to align with fretboard label zone
    const TAB_LEFT = 36;          // matches fretboard left edge
    const LABEL_W = 22;           // "E " string label column
    const CONTENT_L = TAB_LEFT + LABEL_W;
    const CONTENT_R = svgW - 16;
    const COL_W = n > 0 ? (CONTENT_R - CONTENT_L) / n : CONTENT_R - CONTENT_L;
    const cx = (i: number) => CONTENT_L + (i + 0.5) * COL_W; // center x of chord column i

    const HEADER_H = 30;   // chord name row height
    const ROW_H = 26;      // each string row height
    const TAB_PAD = 14;
    const TAB_H = TAB_PAD + HEADER_H + strs.length * ROW_H + 12;
    const totalH = TAB_H + fbH;

    // ── Dots to render ────────────────────────────────────────────────────────
    const sel = this.selectedDots();
    const filterToSelected = this.tabBuilderMode() && sel.size > 0;
    const dotsToRender = filterToSelected
      ? this.dots().filter(d => sel.has(dotKey(d.color, d.si, d.label, d.fret)))
      : this.dots();

    // ── SVG ───────────────────────────────────────────────────────────────────
    const L: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${totalH}" viewBox="0 0 ${svgW} ${totalH}" font-family="sans-serif">`,
    ];

    if (!transparent) L.push(`<rect x="0" y="0" width="${svgW}" height="${totalH}" fill="${bg}"/>`);

    // Chord name header row
    const nameY = TAB_PAD + HEADER_H * 0.72;
    cols.forEach(({ name }, i) => {
      L.push(`<text x="${cx(i)}" y="${nameY}" fill="${fg}" font-size="15" font-weight="700" text-anchor="middle">${esc(name)}</text>`);
    });

    // Header separator
    const sepY = TAB_PAD + HEADER_H;
    L.push(`<line x1="${TAB_LEFT}" y1="${sepY}" x2="${CONTENT_R}" y2="${sepY}" stroke="${fg}" stroke-opacity="0.2" stroke-width="1"/>`);

    // Column dividers (full height of string rows)
    const gridTop = sepY;
    const gridBot = TAB_PAD + HEADER_H + strs.length * ROW_H;
    for (let i = 0; i <= n; i++) {
      const lx = CONTENT_L + i * COL_W;
      L.push(`<line x1="${lx}" y1="${gridTop}" x2="${lx}" y2="${gridBot}" stroke="${fg}" stroke-opacity="0.15" stroke-width="1"/>`);
    }

    // String rows
    strs.forEach((s, si) => {
      const rowTop = sepY + si * ROW_H;
      const midY = rowTop + ROW_H / 2;
      const textY = midY + 5; // baseline nudge

      // String label
      L.push(`<text x="${CONTENT_L - 4}" y="${textY}" fill="${fg}" fill-opacity="0.65" font-size="13" font-weight="600" text-anchor="end">${esc(s.label)}</text>`);

      // Horizontal string rule
      L.push(`<line x1="${CONTENT_L}" y1="${midY}" x2="${CONTENT_R}" y2="${midY}" stroke="${fg}" stroke-opacity="0.18" stroke-width="1"/>`);

      // Fret cell per chord column
      cols.forEach(({ pos }, i) => {
        const fret = pos.get(si);
        if (fret !== undefined) {
          L.push(`<text x="${cx(i)}" y="${textY}" fill="${fg}" fill-opacity="0.9" font-size="14" font-weight="700" text-anchor="middle">${fret}</text>`);
        } else {
          L.push(`<text x="${cx(i)}" y="${textY}" fill="${fg}" fill-opacity="0.2" font-size="11" text-anchor="middle">—</text>`);
        }
      });
    });

    // Bottom border of tab section / separator to fretboard
    L.push(`<line x1="${TAB_LEFT}" y1="${gridBot + 4}" x2="${CONTENT_R}" y2="${gridBot + 4}" stroke="${fg}" stroke-opacity="0.2" stroke-width="1"/>`);

    // Fretboard — shifted down by TAB_H
    L.push(`<g transform="translate(0,${TAB_H})">`);
    L.push(`<rect x="36" y="${MT}" width="6" height="${geom.stringY2 - MT}" fill="${fg}"/>`);
    for (const fl of this.svgFretLines) {
      L.push(`<line x1="${fl.x}" y1="${MT}" x2="${fl.x}" y2="${geom.stringY2}" stroke="${fg}" stroke-width="${fl.isNut ? 4 : 1.5}" stroke-opacity="${fl.isNut ? 0.65 : 0.3}"/>`);
    }
    for (const m of geom.markers) L.push(`<circle cx="${m.cx}" cy="${m.cy}" r="6" fill="${fg}" opacity="0.13"/>`);
    for (const s of geom.strings) {
      L.push(`<line x1="36" y1="${s.y}" x2="${svgW - 16}" y2="${s.y}" stroke="${fg}" stroke-width="2" stroke-opacity="0.5"/>`);
      L.push(`<text x="30" y="${s.y}" fill="${fg}" fill-opacity="0.65" font-size="14" font-weight="600" text-anchor="end" dominant-baseline="middle">${esc(s.label)}</text>`);
    }
    for (const fn of this.svgFretNumbers) {
      L.push(`<text x="${fn.x}" y="${geom.fretNumY}" fill="${fg}" fill-opacity="0.65" font-size="12" text-anchor="middle">${fn.label}</text>`);
    }
    for (const dot of dotsToRender) {
      L.push(`<circle cx="${dot.x}" cy="${dot.y}" r="${dot.r}" fill="${dot.color}"/>`);
      L.push(`<text x="${dot.x}" y="${dot.y}" fill="#000" font-size="11" font-weight="800" text-anchor="middle" dominant-baseline="central">${esc(dot.label)}</text>`);
    }
    L.push('</g>');
    L.push('</svg>');

    return { svg: L.join('\n'), w: svgW, h: totalH };
  }

  private renderToDataUrl(fg: string, bg: string, transparent: boolean): Promise<string> {
    const { svg, w, h } = this.buildExportSvg(fg, bg, transparent);
    const scale = 2; // 2× for retina sharpness

    return new Promise<string>((resolve, reject) => {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
      img.src = url;
    });
  }
}
