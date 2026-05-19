import abcjs from 'abcjs/dist/abcjs-basic';
import localDbSvc from '../../../../src/services/localDbSvc';

jest.mock('abcjs/dist/abcjs-basic', () => ({
  renderAbc: jest.fn(),
  synth: {
    supportsAudio: jest.fn(() => true),
    SynthController: jest.fn(),
  },
}));
jest.mock('../../../../src/services/localDbSvc', () => ({
  __esModule: true,
  default: {
    loadItem: jest.fn(),
  },
}));
jest.mock('../../../../src/store', () => ({
  __esModule: true,
  default: {
    state: {
      file: {
        itemsById: {
          file1: {
            id: 'file1',
            name: 'ABC Export',
          },
        },
      },
    },
  },
}));

const { renderAbc } = abcjs;

function setContent(text, renderer = 'abcjs') {
  localDbSvc.loadItem.mockResolvedValue({
    text,
    properties: [
      'extensions:',
      '  preset: gfm',
      '  abc:',
      '    enabled: true',
      `    renderer: ${renderer}`,
      '    strict: true',
    ].join('\n'),
  });
}

describe('ABC export rendering', () => {
  let exportSvc;

  beforeAll(() => {
    require('../../../../src/extensions/abcExtension'); // eslint-disable-line global-require
    require('../../../../src/extensions/markdownExtension'); // eslint-disable-line global-require
    exportSvc = require('../../../../src/services/exportSvc').default; // eslint-disable-line global-require
  });

  beforeEach(() => {
    renderAbc.mockReset();
    localDbSvc.loadItem.mockReset();
    renderAbc.mockImplementation((targetElement) => {
      targetElement.innerHTML = '<svg class="abcjs-note"></svg>';
      return [{}];
    });
  });

  it('should keep rendered ABC SVG in HTML template output', async () => {
    setContent('```abc\nX:1\nT:Export\nK:C\nCDEF|\n```');

    const html = await exportSvc.applyTemplate('file1', {
      value: '{{{files.0.content.html}}}',
      helpers: '',
    });

    expect(html).toContain('<svg class="abcjs-note"></svg>');
    expect(html).toContain('abc-notation-source--hidden');
  });

  it('should keep ABC diagnostics in HTML template output', async () => {
    setContent('```abc\nX:1\nK:C\nCDEF|\n```');

    const html = await exportSvc.applyTemplate('file1', {
      value: '{{{files.0.content.html}}}',
      helpers: '',
    });

    expect(html).toContain('abc-notation-status--warning');
    expect(html).toContain('Missing required ABC header field T:.');
  });

  it('should keep visible ABC source fallback in HTML template output after render failure', async () => {
    setContent('```abc\nX:1\nT:Broken\nK:C\nCDEF|\n```');
    renderAbc.mockImplementation(() => {
      throw new Error('Renderer failed');
    });

    const html = await exportSvc.applyTemplate('file1', {
      value: '{{{files.0.content.html}}}',
      helpers: '',
    });

    expect(html).toContain('abc-notation-source-fallback');
    expect(html).toContain('Renderer failed');
    expect(html).toContain('X:1');
  });
});
