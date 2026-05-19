import abcjs from 'abcjs/dist/abcjs-basic';
import abcNotationSvc from '../../../../src/services/abcNotation';
import fixtures from '../../fixtures/abcNotationFeatureFixtures';
import {
  abcMarkdownTortureTest,
  dingDongRawAbc,
} from '../../fixtures/abcRawTunebookFixtures';

jest.mock('abcjs/dist/abcjs-basic', () => ({
  renderAbc: jest.fn(),
  synth: {
    supportsAudio: jest.fn(() => true),
    SynthController: jest.fn(),
  },
}));
jest.mock('!raw-loader!abc2svg/abc2svg-1.js', () => (
  // eslint-disable-next-line global-require
  require('fs').readFileSync(require.resolve('abc2svg/abc2svg-1.js'), 'utf8')
));

const { renderAbc } = abcjs;

describe('abcNotation feature fixtures', () => {
  beforeEach(() => {
    renderAbc.mockReset();
    renderAbc.mockImplementation((targetElement) => {
      targetElement.innerHTML = '<svg data-renderer="abcjs"></svg>';
      return [{
        warnings: [],
      }];
    });
  });

  fixtures.forEach((fixture) => {
    fixture.renderers.forEach((renderer) => {
      it(`should render ${fixture.id} with ${renderer}`, () => {
        const targetElement = document.createElement('div');
        const renderContext = abcNotationSvc.parseTunebook(fixture.abc, {
          renderer,
          strict: true,
        });

        expect(renderContext.adapter.name).toBe(renderer);
        expect(renderContext.tunes).toHaveLength(1);

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

        expect(targetElement.querySelector('svg')).toBeTruthy();
        expect(targetElement.textContent).not.toContain(fixture.abc);
        if (fixture.expectWarnings) {
          expect(diagnostics.length).toBeGreaterThan(0);
        } else {
          expect(diagnostics).toEqual([]);
        }
      });
    });
  });

  it('should render the Ding Dong raw ABC tune through abcjs', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook(dingDongRawAbc, {
      renderer: 'abcjs',
      strict: true,
    });

    expect(renderContext.tunes).toHaveLength(1);
    expect(renderContext.tunes[0].title).toBe('Ding Dong! Merrily On High');

    abcNotationSvc.renderTune(renderContext.tunes[0], targetElement, renderContext);

    expect(renderAbc).toHaveBeenCalled();
    expect(targetElement.querySelector('svg')).toBeTruthy();
  });

  it('should render the ABC Markdown torture test through abcjs', () => {
    const targetElement = document.createElement('div');
    const renderContext = abcNotationSvc.parseTunebook(abcMarkdownTortureTest, {
      renderer: 'abcjs',
      strict: true,
    });

    expect(renderContext.tunes).toHaveLength(1);
    expect(renderContext.tunes[0].title).toBe('ABC Markdown Torture Test');

    abcNotationSvc.renderTune(renderContext.tunes[0], targetElement, renderContext);

    expect(renderAbc).toHaveBeenCalled();
    expect(renderAbc.mock.calls[0][1]).toContain('K:Dmix');
    expect(renderAbc.mock.calls[0][1]).toContain('[V:melody]');
    expect(targetElement.querySelector('svg')).toBeTruthy();
  });
});
