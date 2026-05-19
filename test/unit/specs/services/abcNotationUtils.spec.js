import {
  applyPostponedLyricsShim,
  collectStrictDiagnostics,
  normalizeRendererOptions,
  splitTunebook,
} from '../../../../src/services/abcNotation/utils';

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
    expect(diagnostics.map(diagnostic => diagnostic.message)).toContain(
      'ABC 2.1 tunes should begin with an X: reference number.',
    );
    expect(diagnostics.map(diagnostic => diagnostic.message)).toContain(
      'Missing required ABC header field X:.',
    );
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
});
