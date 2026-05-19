import Prism from 'prismjs';
import abcNotationSvc from '../services/abcNotation';
import extensionSvc from '../services/extensionSvc';

Prism.languages.abc = {
  comment: /%.*/,
  directive: /^%%.*/m,
  field: /^[A-Za-z]:.*/m,
  chord: /"[^"]*"/,
  decoration: /![^!]+!|[.+HLMOPSTuv~]/,
  bar: /\[?\|+]?|:{1,2}\|?|\|?:{1,2}|\[[1-9][\d,-]*/,
  tuplet: /\([2-9](?::\d+(?::\d+)?)?/,
  note: /[_=^]*[A-Ga-g][,']*\d*(?:\/\d*)?|[xz]\d*(?:\/\d*)?/,
  punctuation: /[()[\]{}<>-]/,
};

function createElement(tagName, className, text) {
  const elt = document.createElement(tagName);
  if (className) {
    elt.className = className;
  }
  if (text) {
    elt.textContent = text;
  }
  return elt;
}

function renderDiagnostics(parentElt, diagnostics) {
  if (!diagnostics.length) {
    return;
  }
  const listElt = createElement('ul', 'abc-notation-diagnostics');
  diagnostics.forEach((diagnostic) => {
    const itemElt = createElement(
      'li',
      `abc-notation-diagnostic abc-notation-diagnostic--${diagnostic.severity}`,
    );
    itemElt.textContent = diagnostic.line
      ? `Line ${diagnostic.line}: ${diagnostic.message}`
      : diagnostic.message;
    listElt.appendChild(itemElt);
  });
  parentElt.appendChild(listElt);
}

function appendSourceFallback(parentElt, content, hidden) {
  const preElt = createElement('pre', hidden
    ? 'abc-notation-source abc-notation-source--hidden'
    : 'abc-notation-source abc-notation-source-fallback');
  const codeElt = createElement('code', 'prism language-abc', content);
  preElt.appendChild(codeElt);
  parentElt.appendChild(preElt);
}

function renderBlock(blockElt, content, options) {
  const renderContext = abcNotationSvc.parseTunebook(content, options);
  blockElt.innerHTML = '';
  if (!renderContext.tunes.length) {
    appendSourceFallback(blockElt, content, false);
    return;
  }
  renderContext.tunes.forEach((tune) => {
    const tuneElt = createElement('section', 'abc-notation-tune');
    tuneElt.id = `abc-tune-${tune.startLine}-${`${tune.id || tune.index}`.replace(/\W+/g, '-')}`;
    if (tune.title) {
      tuneElt.appendChild(createElement('div', 'abc-notation-title', tune.title));
    }
    const outputElt = createElement('div', 'abc-notation-output');
    tuneElt.appendChild(outputElt);
    try {
      const renderedTunes = abcNotationSvc.renderTune(tune, outputElt, renderContext) || [];
      const diagnostics = abcNotationSvc.collectDiagnostics(tune, renderedTunes, renderContext);
      renderDiagnostics(tuneElt, diagnostics);
      const playbackElt = createElement('div', 'abc-notation-playback');
      if (abcNotationSvc.renderPlaybackControls(tune, playbackElt, renderContext)) {
        tuneElt.appendChild(playbackElt);
      }
      appendSourceFallback(tuneElt, tune.pure, true);
    } catch (e) {
      renderDiagnostics(tuneElt, [{
        severity: 'error',
        line: tune.startLine,
        message: e.message || `${e}`,
      }]);
      appendSourceFallback(tuneElt, tune.pure, false);
    }
    blockElt.appendChild(tuneElt);
  });
}

function renderLegacyBlock(elt, options) {
  const content = elt.textContent;
  const blockElt = createElement('div', 'abc-notation-block');
  elt.parentNode.parentNode.replaceChild(blockElt, elt.parentNode);
  renderBlock(blockElt, content, options);
}

function isInsideAbcBlock(elt) {
  let currentElt = elt.parentNode;
  while (currentElt) {
    if (currentElt.classList && currentElt.classList.contains('abc-notation-block')) {
      return true;
    }
    currentElt = currentElt.parentNode;
  }
  return false;
}

extensionSvc.onGetOptions((options, properties) => {
  options.abc = typeof properties.extensions.abc === 'object'
    ? properties.extensions.abc
    : { enabled: !!properties.extensions.abc };
});

extensionSvc.onInitConverter(5, (markdown, options) => {
  const defaultFence = markdown.renderer.rules.fence ||
    ((tokens, idx, opts, env, self) => self.renderToken(tokens, idx, opts));
  markdown.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const language = token.info.trim().split(/\s+/g)[0];
    if (!options.abc || !options.abc.enabled || language !== 'abc') {
      return defaultFence(tokens, idx, opts, env, self);
    }
    return [
      '<div class="abc-notation-block">',
      '<pre class="abc-notation-source"><code class="prism language-abc">',
      markdown.utils.escapeHtml(token.content),
      '</code></pre>',
      '</div>',
    ].join('');
  };
});

extensionSvc.onSectionPreview((elt, options) => {
  if (!options.abc || !options.abc.enabled) {
    return;
  }
  elt.querySelectorAll('.abc-notation-block > .abc-notation-source > .language-abc')
    .cl_each(sourceElt => renderBlock(
      sourceElt.parentNode.parentNode,
      sourceElt.textContent,
      options.abc,
    ));
  elt.querySelectorAll('.prism.language-abc')
    .cl_each((notationElt) => {
      if (!isInsideAbcBlock(notationElt)) {
        renderLegacyBlock(notationElt, options.abc);
      }
    });
});
