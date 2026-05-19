import markdownConversionSvc from '../../../../src/services/markdownConversionSvc';
import '../../../../src/extensions/abcExtension';
import '../../../../src/extensions/markdownExtension';

describe('markdown ABC editor highlighting', () => {
  beforeEach(() => {
    markdownConversionSvc.init();
  });

  it('should tokenize fenced abc contents with the ABC grammar', () => {
    const html = markdownConversionSvc.highlight([
      '```abc',
      'X:1',
      'T:Scale',
      'K:C',
      'C D E F |',
      '```',
    ].join('\n'));

    expect(html).toContain('language-abc');
    expect(html).toContain('token field');
    expect(html).toContain('token note');
  });

  it('should leave non-ABC fences on their own language grammar', () => {
    const html = markdownConversionSvc.highlight([
      '```js',
      'const value = 1;',
      '```',
    ].join('\n'));

    expect(html).toContain('language-js');
    expect(html).toContain('token keyword');
    expect(html).not.toContain('language-abc');
  });

  it('should preserve regular Markdown highlighting', () => {
    const html = markdownConversionSvc.highlight('# Heading');

    expect(html).toContain('token h1');
    expect(html).toContain('token cl cl-hash');
  });
});
