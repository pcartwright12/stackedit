import renderAbc from 'abcjs/src/api/abc_tunebook_svg';
import {
  applyPostponedLyricsShim,
  collectStrictDiagnostics,
  normalizeRendererOptions,
  splitTunebook,
} from './utils';

function normalizeDiagnostic(diagnostic, fallbackLine) {
  if (typeof diagnostic === 'string') {
    return {
      severity: 'warning',
      line: fallbackLine,
      message: diagnostic.replace(/<[^>]+>/g, ''),
    };
  }
  return {
    severity: diagnostic.severity || 'warning',
    line: diagnostic.line || fallbackLine,
    message: diagnostic.message || `${diagnostic}`,
  };
}

const abcjsAdapter = {
  name: 'abcjs',
  parseTunebook(source, options) {
    return splitTunebook(source).map(tune => ({
      ...tune,
      abc: options.fixPostponedLyrics === false
        ? tune.abc
        : applyPostponedLyricsShim(tune.abc),
    }));
  },
  renderTune(tune, targetElement, options) {
    const renderOptions = {
      ...options,
      startingTune: 0,
    };
    return renderAbc(targetElement, tune.abc, renderOptions);
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

const adapters = {
  abcjs: abcjsAdapter,
};

function getAdapter(options) {
  return adapters[options.renderer] || abcjsAdapter;
}

export default {
  parseTunebook(source, options = {}) {
    const normalizedOptions = normalizeRendererOptions(options);
    const adapter = getAdapter(normalizedOptions);
    const tunes = adapter.parseTunebook(source, normalizedOptions);
    return {
      adapter,
      options: normalizedOptions,
      tunes,
      diagnostics: adapters[normalizedOptions.renderer] ? [] : [{
        severity: 'warning',
        line: 1,
        message: `ABC renderer "${normalizedOptions.renderer}" is not available; using abcjs.`,
      }],
    };
  },
  renderTune(tune, targetElement, renderContext) {
    return renderContext.adapter.renderTune(tune, targetElement, renderContext.options);
  },
  collectDiagnostics(tune, renderedTunes, renderContext) {
    const diagnostics = renderContext.adapter
      .collectDiagnostics(tune, renderedTunes, renderContext.options);
    return renderContext.diagnostics.concat(diagnostics);
  },
  renderPlaybackControls(tune, targetElement, renderContext) {
    if (!renderContext.options.playback) {
      return false;
    }
    return renderContext.adapter.renderPlaybackControls(tune, targetElement, renderContext.options);
  },
};
