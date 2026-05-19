import renderAbc from 'abcjs/src/api/abc_tunebook_svg';

jest.mock('abcjs/src/api/abc_tunebook_svg', () => jest.fn());
jest.mock('!raw-loader!abc2svg/abc2svg-1.js', () => (
  // eslint-disable-next-line global-require
  require('fs').readFileSync(require.resolve('abc2svg/abc2svg-1.js'), 'utf8')
));

const abcNotationSvc = require('../../../../src/services/abcNotation').default;

describe('abcNotation abc2svg adapter', () => {
  beforeEach(() => {
    renderAbc.mockReset();
  });

  it('should select abc2svg when configured and available', () => {
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:abc2svg\nK:C\nCDEF|', {
      renderer: 'abc2svg',
    });

    expect(renderContext.adapter.name).toBe('abc2svg');
    expect(renderContext.diagnostics).toEqual([]);
    expect(abcNotationSvc.getAvailableRenderers()).toContain('abc2svg');
  });

  it('should render abc2svg output into the target element', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:abc2svg\nK:C\nCDEF|', {
      renderer: 'abc2svg',
    });

    const renderedTunes = abcNotationSvc.renderTune(
      renderContext.tunes[0],
      targetElement,
      renderContext,
    );

    expect(renderedTunes[0].renderer).toBe('abc2svg');
    expect(targetElement.querySelector('svg')).toBeTruthy();
    expect(targetElement.innerHTML).toContain('<svg');
  });

  it('should normalize abc2svg diagnostics', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:abc2svg\nK:C\nG-F|\n', {
      renderer: 'abc2svg',
      strict: false,
    });
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

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]).toMatchObject({
      severity: 'error',
      line: expect.any(Number),
      message: 'Bad tie',
    });
  });

  it('should surface abc2svg hard render failures for the preview fallback path', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook('X:1\nT:abc2svg\nK:C\nCDEF|', {
      renderer: 'abc2svg',
    });
    const originalTune = renderContext.tunes[0];
    const brokenTune = {
      ...originalTune,
      abc: null,
    };

    expect(() => abcNotationSvc.renderTune(brokenTune, targetElement, renderContext))
      .toThrow();
  });
});
