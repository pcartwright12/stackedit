import MarkdownIt from 'markdown-it';
import '../../../../src/libs/clunderscore';
import { dingDongRawAbc } from '../../fixtures/abcRawTunebookFixtures';

function createAbcNotationSvcMock(overrides = {}) {
  const tunes = overrides.tunes || [{
    abc: 'X:1\nT:One\nK:C\nCDEF|',
    pure: 'X:1\nT:One\nK:C\nCDEF|',
    index: 0,
    startLine: 1,
    id: '1',
    title: 'One',
  }];
  const renderContext = {
    adapter: { name: 'abcjs' },
    options: {},
    tunes,
    diagnostics: overrides.contextDiagnostics || [],
  };
  return {
    parseTunebook: jest.fn(() => renderContext),
    renderTune: jest.fn(() => overrides.renderedTunes || []),
    collectDiagnostics: jest.fn(() => (
      renderContext.diagnostics.concat(overrides.diagnostics || [])
    )),
    renderPlaybackControls: jest.fn((tune, targetElement) => {
      if (!overrides.playback) {
        return false;
      }
      targetElement.textContent = 'Playback controls';
      return true;
    }),
  };
}

function loadExtension(abcNotationSvcMock) {
  jest.resetModules();
  jest.doMock('../../../../src/services/abcNotation', () => ({
    __esModule: true,
    default: abcNotationSvcMock,
  }));

  const extensionSvc = require('../../../../src/services/extensionSvc').default; // eslint-disable-line global-require
  require('../../../../src/extensions/abcExtension'); // eslint-disable-line global-require
  return extensionSvc;
}

function renderMarkdownFence(extensionSvc, source, options = { abc: { enabled: true } }) {
  const markdown = new MarkdownIt();
  extensionSvc.initConverter(markdown, options);
  return markdown.render(source);
}

describe('abcExtension', () => {
  afterEach(() => {
    jest.dontMock('../../../../src/services/abcNotation');
  });

  it('should render fenced abc blocks through the ABC preview block', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock();
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, '```abc\nX:1\nT:One\nK:C\nCDEF|\n```');
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelectorAll('.abc-notation-block')).toHaveLength(1);
    expect(container.querySelector('.abc-notation-title').textContent).toBe('One');
    expect(container.querySelector('.abc-notation-status').textContent).toContain('abcjs - OK');
    expect(container.querySelector('.abc-notation-output')).toBeTruthy();
    expect(container.querySelector('.abc-notation-source--hidden')).toBeTruthy();
    expect(abcNotationSvcMock.renderTune).toHaveBeenCalled();
  });

  it('should render every tune in a multi-tune block', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock({
      tunes: [{
        pure: 'X:1\nT:One\nK:C\nCDEF|',
        index: 0,
        startLine: 1,
        id: '1',
        title: 'One',
      }, {
        pure: 'X:2\nT:Two\nK:G\nGABc|',
        index: 1,
        startLine: 6,
        id: '2',
        title: 'Two',
      }],
    });
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, [
      '```abc',
      'X:1',
      'T:One',
      'K:C',
      'CDEF|',
      '',
      'X:2',
      'T:Two',
      'K:G',
      'GABc|',
      '```',
    ].join('\n'));
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelectorAll('.abc-notation-tune')).toHaveLength(2);
    expect(container.querySelectorAll('.abc-notation-title')[1].textContent).toBe('Two');
    expect(container.querySelectorAll('.abc-notation-status')).toHaveLength(2);
    expect(abcNotationSvcMock.renderTune).toHaveBeenCalledTimes(2);
  });

  it('should keep source visible after hard render failures', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock();
    abcNotationSvcMock.renderTune.mockImplementation(() => {
      throw new Error('Renderer failed');
    });
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, '```abc\nX:1\nT:One\nK:C\nCDEF|\n```');
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelector('.abc-notation-diagnostic--error').textContent)
      .toContain('Renderer failed');
    expect(container.querySelector('.abc-notation-status--error').textContent)
      .toContain('1 error');
    expect(container.querySelector('.abc-notation-source-fallback').textContent)
      .toContain('X:1');
  });

  it('should keep source visible for renderer fallback diagnostics', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock({
      contextDiagnostics: [{
        severity: 'warning',
        line: 1,
        message: 'ABC renderer "abc2svg" is not available; using abcjs.',
      }],
    });
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, '```abc\nX:1\nT:One\nK:C\nCDEF|\n```');
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelector('.abc-notation-diagnostics').textContent)
      .toContain('using abcjs');
    expect(container.querySelector('.abc-notation-status--warning').textContent)
      .toContain('1 warning');
    expect(container.querySelector('.abc-notation-source-fallback').textContent)
      .toContain('X:1');
  });

  it('should show line labels in tune diagnostics', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock({
      diagnostics: [{
        severity: 'warning',
        line: 4,
        message: 'Unexpected rhythm',
      }],
    });
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, '```abc\nX:1\nT:One\nK:C\nCDEF|\n```');
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelector('.abc-notation-diagnostic--warning').textContent)
      .toContain('Line 4: Unexpected rhythm');
  });

  it('should render playback controls only when the service provides them', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock({
      playback: true,
    });
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, '```abc\nX:1\nT:One\nK:C\nCDEF|\n```');
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true, playback: true } });

    expect(container.querySelector('.abc-notation-playback').textContent)
      .toBe('Playback controls');
  });

  it('should preserve the same DOM contract for abc2svg blocks', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock();
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, '```abc\nX:1\nT:One\nK:C\nCDEF|\n```', {
      abc: {
        enabled: true,
        renderer: 'abc2svg',
      },
    });
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, {
      abc: {
        enabled: true,
        renderer: 'abc2svg',
      },
    });

    expect(container.querySelector('.abc-notation-block')).toBeTruthy();
    expect(container.querySelector('.abc-notation-output')).toBeTruthy();
    expect(container.querySelector('.abc-notation-source--hidden')).toBeTruthy();
    expect(abcNotationSvcMock.parseTunebook.mock.calls[0][1]).toMatchObject({
      renderer: 'abc2svg',
    });
  });

  it('should leave non-abc fences on the default fence path', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock();
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, '```js\nconst value = 1;\n```');

    expect(html).not.toContain('abc-notation-block');
    expect(html).toContain('language-js');
  });

  it('should auto-render raw ABC tunebooks in preview', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock();
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, dingDongRawAbc);
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelector('.abc-notation-block')).toBeTruthy();
    expect(container.querySelector('.abc-notation-output')).toBeTruthy();
    expect(abcNotationSvcMock.renderTune).toHaveBeenCalled();
    expect(abcNotationSvcMock.parseTunebook.mock.calls[0][0])
      .toContain('T: Ding Dong! Merrily On High');
  });

  it('should remove dangling closing fences from auto-rendered raw ABC', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock();
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, `${dingDongRawAbc}\n\`\`\``);
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelectorAll('pre')).toHaveLength(1);
    expect(container.querySelector('.abc-notation-source').textContent).not.toContain('```');
    expect(abcNotationSvcMock.parseTunebook.mock.calls[0][0]).not.toContain('```');
  });

  it('should not auto-render ordinary Markdown paragraphs', () => {
    const abcNotationSvcMock = createAbcNotationSvcMock();
    const extensionSvc = loadExtension(abcNotationSvcMock);
    const html = renderMarkdownFence(extensionSvc, [
      'X: This looks like a label.',
      'K: This is not an ABC tune.',
      'There are no notes here.',
    ].join('\n'));
    const container = document.createElement('div');
    container.innerHTML = html;

    extensionSvc.sectionPreview(container, { abc: { enabled: true } });

    expect(container.querySelector('.abc-notation-block')).toBeFalsy();
    expect(abcNotationSvcMock.parseTunebook).not.toHaveBeenCalled();
  });
});
