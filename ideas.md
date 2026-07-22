# Ideas

## High value, low effort

- **Highlight lowest position only** — toggle to show just the closest root note to the nut per chord, the most natural bass fingering for each chord in first position.
- **Slash chord support** — `C/E` should place the dot on E, not C. Useful for descending bass lines.
- **Chord progression playback** — step through chords one at a time with prev/next buttons; active chord is highlighted, others are dimmed. Helps practice transitions.
- **G string option** — toggle to show all 4 bass strings instead of 3.

## Medium effort

- **Fret range selector** — choose which fret window to display (e.g. 5–9) to focus on a specific position on the neck.
- **Scale overlay** — show the minor pentatonic or major scale for a given key as faint background dots, so the root notes land in context.
- **Interval labels** — show the interval name (root, 5th, octave) instead of the note letter inside each dot.
- **Copy as tab** — export the current fretboard view as ASCII tab notation.

## In progress / under consideration

- **Legend filter** — clicking a chord pill in the legend solos that root: its dots go full brightness, all others dim. Clicking again deselects. Multiple pills can be active at once (toggle on/off independently), so the user can compare any subset of chords side by side. Interacts cleanly with the existing playback dimming: legend filter takes precedence when no playback is active; playback overrides it when active. Deselects automatically when playback starts.

- **Tab builder (pick your positions)** — a "Build tab" mode where the fretboard becomes interactive. Each dot is clickable; selected dots are marked (ring or checkmark). "Copy tab" then uses only the selected positions instead of the auto-lowest. This gives the user full control over which voicing/position they want per chord — e.g., prefer the A-string-fret-5 A rather than the open A string, or build a walking bass line that moves across the neck. One natural constraint: allow at most one selected dot per chord column per string so the tab stays readable. Pairs with intervals mode (select specific R and 5 positions per chord). A "Clear selection" button resets back to default auto-lowest behavior.

- **Tuning presets** — drop D, BEAD, or custom open tuning; recalculates all note positions automatically.
- **Shareable URL** — encode the chord progression in the query string so a link reopens the same view.
- **Mobile landscape hint** — on small screens, nudge the user to rotate for the full fretboard.
