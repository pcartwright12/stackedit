import {
  applyPostponedLyricsShim,
  collectRawAbcBlock,
  collectStrictDiagnostics,
  isLikelyAbcTunebook,
  normalizeRendererOptions,
  sanitizeRawAbcSource,
  splitTunebook,
} from '../../../../src/services/abcNotation/utils';
import {
  abcMarkdownTortureTest,
  dingDongRawAbc,
} from '../../fixtures/abcRawTunebookFixtures';

describe('abcNotation utils', () => {
  it('should split multi-tune ABC blocks', () => {
    const tunes = splitTunebook([
      '%%staffwidth 600',
      'X:1',
      'T:One',
      'K:C',
      'CDEF|',
      '',
      'X:2',
      'T:Two',
      'K:G',
      'GABc|',
    ].join('\n'));
    expect(tunes).toHaveLength(2);
    expect(tunes[0].title).toBe('One');
    expect(tunes[1].id).toBe('2');
    expect(tunes[1].abc).toContain('%%staffwidth 600');
  });

  it('should warn when strict ABC headers are incomplete', () => {
    const tune = splitTunebook('T:No reference\nK:C\nCDEF|')[0];
    const diagnostics = collectStrictDiagnostics(tune);
    expect(diagnostics.map(diagnostic => diagnostic.message))
      .toContain('ABC 2.1 tunes should begin with an X: reference number.');
    expect(diagnostics.map(diagnostic => diagnostic.message))
      .toContain('Missing required ABC header field X:.');
  });

  it('should move postponed lyrics to the first unlyricized music line', () => {
    const abc = [
      'X:1',
      'T:Late lyrics',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C D E F |',
      'G A B c |',
      'w: doh re mi fa',
    ].join('\n');
    expect(applyPostponedLyricsShim(abc).split('\n')).toEqual([
      'X:1',
      'T:Late lyrics',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C D E F |',
      'w: doh re mi fa',
      'G A B c |',
    ]);
  });

  it('should normalize renderer options for abcjs', () => {
    expect(normalizeRendererOptions({
      responsive: true,
      staffWidth: 680,
      scale: 0.9,
      strict: true,
      fixPostponedLyrics: false,
    })).toEqual({
      renderer: 'abcjs',
      responsive: 'resize',
      staffwidth: 680,
      scale: 0.9,
      strict: true,
      playback: false,
      fixPostponedLyrics: false,
    });
  });

  it('should detect raw multi-voice ABC tunebooks', () => {
    expect(isLikelyAbcTunebook(dingDongRawAbc)).toBe(true);
  });

  it('should detect raw ABC that starts music lines with named voices', () => {
    expect(isLikelyAbcTunebook(abcMarkdownTortureTest)).toBe(true);
    expect(splitTunebook(abcMarkdownTortureTest)[0].title)
      .toBe('ABC Markdown Torture Test');
  });

  it('should collect raw ABC without markdown mutations', () => {
    const block = collectRawAbcBlock(`${abcMarkdownTortureTest}\n\nA following paragraph.`);

    expect(block.source).toContain('C:Parser Goblin');
    expect(block.source).toContain('V:melody name="Melody" clef=treble');
    expect(block.source).toContain('%%staves (melody harmony) bass');
    expect(block.source).toContain('[V:melody] "D" {g}A2F');
    expect(block.source).toContain('w:Ly-ric test with~joined words and mel-is-ma_');
    expect(block.source).toContain('[V:bass] D,,3 A,,3');
    expect(block.source).not.toContain('A following paragraph.');
  });

  it('should reject prose-interrupted raw ABC', () => {
    expect(isLikelyAbcTunebook(abcMarkdownTortureTest.replace(
      '\n\n[V:melody]',
      '\n\nThis prose explains the tune before the notes.\n\n[V:melody]',
    ))).toBe(false);
  });

  it('should detect raw multi-tune ABC tunebooks', () => {
    expect(isLikelyAbcTunebook([
      'X:1',
      'T:One',
      'K:C',
      'CDEF|',
      'X:2',
      'T:Two',
      'K:G',
      'GABc|',
    ].join('\n'))).toBe(true);
  });

  it('should strip dangling closing fences from raw ABC source', () => {
    expect(sanitizeRawAbcSource('X:1\nT:One\nK:C\nCDEF|\n```'))
      .toBe('X:1\nT:One\nK:C\nCDEF|');
    expect(sanitizeRawAbcSource('X:1\nT:One\nK:C\nCDEF|\n~~~'))
      .toBe('X:1\nT:One\nK:C\nCDEF|');
  });

  it('should reject prose that only mentions ABC-like fields', () => {
    expect(isLikelyAbcTunebook([
      'X: This is a coordinate label.',
      'K: This is not a key signature.',
      'There are no note bars here.',
    ].join('\n'))).toBe(false);
  });

  it('should reject incomplete raw ABC without a key field', () => {
    expect(isLikelyAbcTunebook('X:1\nT:No Key\nCDEF|')).toBe(false);
  });
});
