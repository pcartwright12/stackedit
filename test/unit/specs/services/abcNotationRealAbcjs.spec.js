import { abcMarkdownTortureTest } from '../../fixtures/abcRawTunebookFixtures';

describe('abcNotation real abcjs rendering', () => {
  it('should render the ABC Markdown torture test to SVG', () => {
    // eslint-disable-next-line global-require
    const abcjs = require('abcjs');
    const targetElement = document.createElement('div');

    const renderedTunes = abcjs.renderAbc(targetElement, abcMarkdownTortureTest, {
      responsive: 'resize',
    });

    expect(renderedTunes).toHaveLength(1);
    expect(targetElement.querySelector('svg')).toBeTruthy();
    expect((renderedTunes[0].warnings || [])).toEqual([]);
  });
});
