# ABC Notation Completion Plan for StackEdit

## Summary

StackEdit's ABC support is being moved from a single `abcjs` preview hook to a dedicated ABC
notation layer. The target is practical ABC 2.1 authoring: explicit Markdown integration,
multi-tune rendering, diagnostics, strict validation, renderer abstraction, export safety,
syntax highlighting, and a path for playback and renderer-specific feature coverage.

The initial implementation keeps `abcjs` as the default renderer and introduces an adapter
contract so abc2svg-compatible support can be added without changing Markdown or preview code.

## Phase 1: Minimum Serious ABC Support

- Replace direct `renderAbc(div, content, {})` calls with an internal ABC service that owns
  tune splitting, renderer selection, diagnostics, and fallback behavior.
- Add an explicit Markdown fence renderer for ` ```abc ` blocks so ABC support does not depend
  on Prism's language-class side effect.
- Render every tune in a multi-tune ABC block. Each tune gets a wrapper, optional title, SVG
  output target, diagnostics area, and source fallback.
- Capture strict ABC 2.1 validation warnings for required `X:`, `T:`, and `K:` fields.
- Preserve source text on hard render failure instead of replacing the block with a blank or
  broken preview.
- Shim postponed `w:` lyric blocks before handing tunes to `abcjs`, so common ABC 2.1 lyric
  placement renders closer to the standard.
- Add renderer options under `extensions.abc`: `renderer`, `strict`, `responsive`,
  `staffWidth`, `playback`, and `fixPostponedLyrics`.

## Phase 2: Complete ABC Feature Coverage

- Keep the renderer adapter interface stable:
  - `parseTunebook(source, options)`
  - `renderTune(tune, targetElement, options)`
  - `collectDiagnostics(tune, renderedTunes, options)`
  - `renderPlaybackControls(tune, targetElement, options)`
- Implement an abc2svg-capable adapter for notation or directive gaps that `abcjs` cannot
  cover reliably.
- Keep `abcjs` as the default renderer; expose `abc2svg` through `extensions.abc.renderer:
  abc2svg` after license review for the LGPL-3.0 package.
- Build regression fixtures for all high-value ABC areas:
  - Core fields: `X T C M L K Q R Z N O A B D F G H S W w`
  - Notes/rhythm: pitch, octave, accidentals, ties, slurs, tuplets, rests, chords,
    grace notes, decorations, dotted rhythms, broken rhythms, and beaming
  - Voices/polyphony: `V:`, clefs, stems, overlays, simultaneous voices, and staff grouping
  - Bars/repeats: repeat starts/ends, first/second endings, double bars, invisible bars,
    and measure numbering
  - Lyrics/text: aligned lyrics, post-tune lyrics, escaping, hyphenation, melisma,
    multiple lyric lines, annotations, and chord symbols
  - Decorations: standard and legacy syntax, user-defined decorations, articulations,
    dynamics, fermatas, trills, mordents, turns, and breath marks
  - Layout/directives: clefs, braces/brackets, percussion clef, transposition, scaling,
    line breaks, page formatting, fonts, spacing, and MIDI directives

## Phase 3: Editor, Export, and Polish

- Add ABC-specific editor highlighting for fenced ABC blocks.
- Add richer diagnostics UX with per-tune badges and line references where the renderer
  provides enough source location data.
- Verify HTML and PDF exports with rendered SVG output, diagnostics, and source fallback.
- Add optional playback controls for tempo, repeats, chords, grace notes, voices, and MIDI
  instruments where the active renderer/backend supports them.
- Document supported renderer differences and known ABC dialect limitations in user-facing
  sample content.

Phase 3 implementation notes: `abcjs` now exposes opt-in browser playback controls, editor
highlighting tokenizes fenced ABC contents, HTML export is covered by unit tests, and PDF export is
tracked as a manual smoke check because it depends on the browser export environment.

## Acceptance Criteria

- A fenced ABC block with multiple `X:` tunes renders every tune in preview and export.
- Invalid or incomplete ABC shows visible diagnostics and does not erase the source.
- Strict mode warns for missing required ABC 2.1 tune headers.
- Postponed `w:` lyrics render under the intended first unlyricized music line for common
  single-voice tunes.
- Renderer choice is isolated behind the adapter contract.
- Existing non-ABC Markdown, Mermaid, KaTeX, and code fences continue to render as before.
