# ABC Renderer Support

StackEdit supports ABC notation through an internal renderer adapter layer.

## Renderers

- `abcjs` is the default renderer. It is MIT licensed and remains the safest default for existing
  documents.
- `abc2svg` is available with `extensions.abc.renderer: abc2svg`. It is useful for ABC notation
  and directive coverage that differs from `abcjs`, but it is distributed under LGPL-3.0 and needs
  release license review before being promoted beyond optional use.

## Shared Behavior

- Both renderers use fenced `abc` Markdown blocks.
- Both renderers render through the same preview DOM contract:
  `.abc-notation-block`, `.abc-notation-tune`, `.abc-notation-output`, diagnostics, and source
  fallback.
- Both renderers preserve source text when rendering fails.
- HTML export uses the same preview rendering path, so rendered SVG, diagnostics, and fallback source
  are preserved in generated template output.

## Known Differences

- `abcjs` is the default and receives the same `staffWidth`, `responsive`, and strict-validation
  options added in Phase 1.
- `abcjs` supports optional playback controls when `extensions.abc.playback` is enabled. Playback
  depends on browser Web Audio support and abcjs synth coverage for the tune.
- `abc2svg` has broader compatibility with some abcm2ps-style directives, but its diagnostics are
  normalized into StackEdit's existing warning/error list and may not match `abcjs` wording.
- `abc2svg` does not provide playback controls through StackEdit.
- ABC feature fixtures cover core fields, notes/rhythm, voices/staves, bars/repeats, lyrics/text,
  and decorations/layout. These tests assert nonempty SVG output and diagnostics behavior, not
  pixel-perfect visual equality.
- Complex regression fixtures include an ABC Markdown torture test with named voices, clefs,
  `%%staves`, modal keys, tuplets, grace notes, chord symbols, lyrics, melisma, and low octaves.
  Use fenced `abc` blocks when this kind of notation appears near explanatory prose.

## PDF Smoke Checks

Before release, verify the PDF export modal with an ABC sample that includes a successful tune, a
strict diagnostic, and a forced renderer fallback. Confirm the PDF output visually contains the
rendered notation, diagnostic text, and visible source fallback where expected.
