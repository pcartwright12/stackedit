import abc2svgAdapter from './adapters/abc2svg';
import abcjsAdapter from './adapters/abcjs';
import capabilities from './capabilities';
import { normalizeRendererOptions } from './utils';

const adapters = {
  abc2svg: abc2svgAdapter,
  abcjs: abcjsAdapter,
};

function getAdapter(options) {
  const adapter = adapters[options.renderer];
  if (adapter && (!adapter.isAvailable || adapter.isAvailable())) {
    return adapter;
  }
  return abcjsAdapter;
}

function isRendererAvailable(renderer) {
  const adapter = adapters[renderer];
  return !!adapter && (!adapter.isAvailable || adapter.isAvailable());
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
      diagnostics: isRendererAvailable(normalizedOptions.renderer) ? [] : [{
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
  getRendererCapabilities(renderer) {
    return capabilities[renderer] || null;
  },
  getAvailableRenderers() {
    return Object.keys(adapters).filter(isRendererAvailable);
  },
};
