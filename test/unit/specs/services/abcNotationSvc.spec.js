import renderAbc from 'abcjs/src/api/abc_tunebook_svg';
import SynthController from 'abcjs/src/synth/synth-controller';
import supportsAudio from 'abcjs/src/synth/supports-audio';
import abcNotationSvc from '../../../../src/services/abcNotation';

jest.mock('abcjs/src/api/abc_tunebook_svg', () => jest.fn());
jest.mock('abcjs/src/synth/supports-audio', () => jest.fn());
jest.mock('abcjs/src/synth/synth-controller', () => jest.fn());

describe('abcNotation service', () => {
  let synthController;

  beforeEach(() => {
    renderAbc.mockReset();
    supportsAudio.mockReset();
    supportsAudio.mockReturnValue(true);
    synthController = {
      load: jest.fn(),
      setTune: jest.fn(() => Promise.resolve()),
    };
    SynthController.mockReset();
    SynthController.mockImplementation(() => synthController);
  });

  it('should fall back to abcjs when renderer is unavailable', () => {
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:Fallback\nK:C\nCDEF|', {
      renderer: 'missing',
    });

    expect(renderContext.adapter.name).toBe('abcjs');
    expect(renderContext.diagnostics).toEqual([{
      severity: 'warning',
      line: 1,
      message: 'ABC renderer "missing" is not available; using abcjs.',
    }]);
  });

  it('should expose renderer capabilities', () => {
    expect(abcNotationSvc.getRendererCapabilities('abcjs')).toMatchObject({
      renderer: 'abcjs',
      supportsPlayback: true,
      supportsDiagnostics: true,
    });
    expect(abcNotationSvc.getRendererCapabilities('abc2svg')).toMatchObject({
      renderer: 'abc2svg',
      supportsPlayback: false,
      supportsDiagnostics: true,
    });
  });

  it('should collect normalized abcjs warnings', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:Warnings\nK:C\nCDEF|', {
      strict: false,
    });
    renderAbc.mockReturnValue([{
      warnings: ['<span>Unexpected bar</span>'],
    }]);

    const renderedTunes = abcNotationSvc.renderTune(
      renderContext.tunes[0],
      targetElement,
      renderContext,
    );
    const diagnostics = abcNotationSvc.collectDiagnostics(
      renderContext.tunes[0],
      renderedTunes,
      renderContext,
    );

    expect(diagnostics).toEqual([{
      severity: 'warning',
      line: 1,
      message: 'Unexpected bar',
    }]);
  });

  it('should shim postponed lyrics before rendering by default', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook([
      'X:1',
      'T:Lyrics',
      'K:C',
      'C D E F |',
      'G A B c |',
      'w: doh re mi fa',
    ].join('\n'));
    renderAbc.mockReturnValue([]);

    abcNotationSvc.renderTune(renderContext.tunes[0], targetElement, renderContext);

    expect(renderAbc.mock.calls[0][1].split('\n')).toEqual([
      'X:1',
      'T:Lyrics',
      'K:C',
      'C D E F |',
      'w: doh re mi fa',
      'G A B c |',
    ]);
  });

  it('should leave postponed lyrics unchanged when the shim is disabled', () => {
    const targetElement = document.createElement('div');
    const source = [
      'X:1',
      'T:Lyrics',
      'K:C',
      'C D E F |',
      'G A B c |',
      'w: doh re mi fa',
    ].join('\n');
    const renderContext = abcNotationSvc.parseTunebook(source, {
      fixPostponedLyrics: false,
    });
    renderAbc.mockReturnValue([]);

    abcNotationSvc.renderTune(renderContext.tunes[0], targetElement, renderContext);

    expect(renderAbc.mock.calls[0][1]).toBe(source);
  });

  it('should surface renderer exceptions for the preview fallback path', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:Broken\nK:C\nCDEF|');
    renderAbc.mockImplementation(() => {
      throw new Error('Renderer failed');
    });

    expect(() => abcNotationSvc.renderTune(renderContext.tunes[0], targetElement, renderContext))
      .toThrow('Renderer failed');
  });

  it('should initialize abcjs playback controls when playback is enabled', () => {
    const targetElement = document.createElement('div');
    const playbackElement = document.createElement('div');
    const visualObj = { millisecondsPerMeasure: jest.fn(), getBeatsPerMeasure: jest.fn() };
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:Playback\nK:C\nCDEF|', {
      playback: true,
    });
    renderAbc.mockReturnValue([visualObj]);

    abcNotationSvc.renderTune(renderContext.tunes[0], targetElement, renderContext);
    const rendered = abcNotationSvc.renderPlaybackControls(
      renderContext.tunes[0],
      playbackElement,
      renderContext,
    );

    expect(rendered).toBe(true);
    expect(synthController.load).toHaveBeenCalledWith(
      playbackElement,
      null,
      expect.objectContaining({
        displayLoop: true,
        displayRestart: true,
        displayPlay: true,
        displayProgress: true,
        displayWarp: true,
      }),
    );
    expect(synthController.setTune).toHaveBeenCalledWith(visualObj, false, {});
  });

  it('should show a playback error state when abcjs synth initialization fails', () => {
    const playbackElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:Playback\nK:C\nCDEF|', {
      playback: true,
    });
    renderContext.tunes[0].renderedTune = {};
    synthController.load.mockImplementation(() => {
      throw new Error('Audio blocked');
    });

    expect(abcNotationSvc.renderPlaybackControls(
      renderContext.tunes[0],
      playbackElement,
      renderContext,
    )).toBe(true);
    expect(playbackElement.textContent).toContain('Audio blocked');
    expect(playbackElement.querySelector('.abc-notation-playback-message--error')).toBeTruthy();
  });

  it('should report abc2svg playback as unsupported', () => {
    expect(abcNotationSvc.getRendererCapabilities('abc2svg')).toMatchObject({
      renderer: 'abc2svg',
      supportsPlayback: false,
    });
  });
});
