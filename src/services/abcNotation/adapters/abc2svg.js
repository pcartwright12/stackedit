// eslint-disable-next-line import/no-webpack-loader-syntax, import/extensions
import abc2svgSource from '!raw-loader!abc2svg/abc2svg-1.js';
import {
  applyPostponedLyricsShim,
  collectStrictDiagnostics,
  normalizeDiagnostic,
  splitTunebook,
} from '../utils';

let abc2svgRuntime;

function getAbc2SvgRuntime() {
  if (!abc2svgRuntime) {
    // abc2svg ships as a browser script, not as an ES/CommonJS renderer export.
    // eslint-disable-next-line no-new-func
    abc2svgRuntime = new Function(`${abc2svgSource}\nreturn abc2svg;`)();
  }
  return abc2svgRuntime;
}

function isAvailable() {
  return typeof abc2svgSource === 'string' && !!abc2svgSource;
}

function getDiagnosticSeverity(message) {
  return /\berror:/i.test(message) ? 'error' : 'warning';
}

function normalizeAbc2SvgDiagnostic(message, line) {
  return {
    severity: getDiagnosticSeverity(message),
    line,
    message: `${message}`.replace(/^.*\b(warning|error):\s*/i, ''),
  };
}

export default {
  name: 'abc2svg',
  isAvailable,
  parseTunebook(source, options) {
    return splitTunebook(source).map(tune => ({
      ...tune,
      abc: options.fixPostponedLyrics === false
        ? tune.abc
        : applyPostponedLyricsShim(tune.abc),
    }));
  },
  renderTune(tune, targetElement) {
    const runtime = getAbc2SvgRuntime();
    const output = [];
    const diagnostics = [];
    const renderer = new runtime.Abc({
      img_out: svg => output.push(svg),
      errmsg: (message, line) => {
        diagnostics.push(normalizeAbc2SvgDiagnostic(message, tune.startLine + (line || 0)));
      },
    });

    renderer.tosvg(`abc-tune-${tune.startLine}-${tune.id || tune.index}`, tune.abc);
    targetElement.innerHTML = output.join('');
    return [{
      renderer: 'abc2svg',
      warnings: diagnostics,
    }];
  },
  collectDiagnostics(tune, renderedTunes, options) {
    const diagnostics = options.strict ? collectStrictDiagnostics(tune) : [];
    (renderedTunes || []).forEach((renderedTune) => {
      (renderedTune.warnings || []).forEach((warning) => {
        diagnostics.push(normalizeDiagnostic(warning, tune.startLine));
      });
    });
    return diagnostics;
  },
  renderPlaybackControls() {
    return false;
  },
};
