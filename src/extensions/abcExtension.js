import Prism from 'prismjs';
import abcNotationSvc from '../services/abcNotation';
import extensionSvc from '../services/extensionSvc';
import markdownFenceLanguageSvc from '../services/markdownFenceLanguageSvc';
import {
  collectRawAbcBlock,
  isLikelyAbcTunebook,
  sanitizeRawAbcSource,
} from '../services/abcNotation/utils';

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
markdownFenceLanguageSvc.registerFenceLanguage('abc', Prism.languages.abc);

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

function countDiagnostics(diagnostics) {
  return diagnostics.reduce((counts, diagnostic) => {
    if (diagnostic.severity === 'error') {
      counts.errors += 1;
    } else {
      counts.warnings += 1;
    }
    return counts;
  }, {
    errors: 0,
    warnings: 0,
  });
}

function renderTuneHeader(tune, renderContext, diagnostics) {
  const headerElt = createElement('div', 'abc-notation-header');
  headerElt.appendChild(createElement(
    'div',
    'abc-notation-title',
    tune.title || `Tune ${tune.index + 1}`,
  ));
  const counts = countDiagnostics(diagnostics);
  let statusType = 'ok';
  if (counts.errors) {
    statusType = 'error';
  } else if (counts.warnings) {
    statusType = 'warning';
  }
  const status = counts.errors
    ? `${counts.errors} error${counts.errors > 1 ? 's' : ''}`
    : `${counts.warnings} warning${counts.warnings > 1 ? 's' : ''}`;
  const cleanStatus = 'OK';
  const renderer = renderContext.options.renderer ||
    (renderContext.adapter && renderContext.adapter.name) ||
    'abcjs';
  const statusElt = createElement(
    'div',
    `abc-notation-status abc-notation-status--${statusType}`,
    `${renderer} - ${counts.errors || counts.warnings ? status : cleanStatus}`,
  );
  headerElt.appendChild(statusElt);
  return headerElt;
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
  const hasContextDiagnostics = !!renderContext.diagnostics.length;
  if (!renderContext.tunes.length) {
    appendSourceFallback(blockElt, content, false);
    return;
  }
  renderContext.tunes.forEach((tune) => {
    const tuneElt = createElement('section', 'abc-notation-tune');
    tuneElt.id = `abc-tune-${tune.startLine}-${`${tune.id || tune.index}`.replace(/\W+/g, '-')}`;
    const outputElt = createElement('div', 'abc-notation-output');
    try {
      const renderedTunes = abcNotationSvc.renderTune(tune, outputElt, renderContext) || [];
      const diagnostics = abcNotationSvc.collectDiagnostics(tune, renderedTunes, renderContext);
      tuneElt.appendChild(renderTuneHeader(tune, renderContext, diagnostics));
      tuneElt.appendChild(outputElt);
      renderDiagnostics(tuneElt, diagnostics);
      const playbackElt = createElement('div', 'abc-notation-playback');
      if (abcNotationSvc.renderPlaybackControls(tune, playbackElt, renderContext)) {
        tuneElt.appendChild(playbackElt);
      }
      appendSourceFallback(tuneElt, tune.pure, !hasContextDiagnostics);
    } catch (e) {
      tuneElt.appendChild(renderTuneHeader(tune, renderContext, [{
        severity: 'error',
      }]));
      tuneElt.appendChild(outputElt);
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

function removeDanglingFenceSibling(elt) {
  const siblingElt = elt && elt.nextElementSibling;
  if (
    siblingElt &&
    siblingElt.tagName === 'PRE' &&
    siblingElt.textContent.trim() === ''
  ) {
    siblingElt.parentNode.removeChild(siblingElt);
  }
}

function renderRawBlock(entries, options) {
  const content = sanitizeRawAbcSource(entries
    .map(entry => entry.sourceElt.textContent)
    .join('\n\n'));
  const blockElt = createElement('div', 'abc-notation-block');
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];
  removeDanglingFenceSibling(lastEntry.containerElt);
  firstEntry.containerElt.parentNode.replaceChild(blockElt, firstEntry.containerElt);
  entries.slice(1).forEach((entry) => {
    if (entry.containerElt.parentNode) {
      entry.containerElt.parentNode.removeChild(entry.containerElt);
    }
  });
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

function getRawAbcEntry(elt) {
  if (!elt || elt.tagName !== 'P') {
    return null;
  }
  const parentElt = elt.parentNode;
  if (
    parentElt &&
    parentElt.classList &&
    parentElt.classList.contains('cl-preview-section')
  ) {
    return {
      containerElt: parentElt,
      sourceElt: elt,
    };
  }
  return {
    containerElt: elt,
    sourceElt: elt,
  };
}

function getNextRawAbcEntry(entry) {
  const nextContainerElt = entry.containerElt.nextElementSibling;
  if (
    nextContainerElt &&
    nextContainerElt.classList &&
    nextContainerElt.classList.contains('cl-preview-section')
  ) {
    return getRawAbcEntry(nextContainerElt.querySelector('p'));
  }
  return getRawAbcEntry(nextContainerElt);
}

function collectRawAbcEntries(startElt) {
  const entries = [];
  let matchedEntries = null;
  let currentEntry = getRawAbcEntry(startElt);
  while (
    currentEntry &&
    !isInsideAbcBlock(currentEntry.containerElt)
  ) {
    entries.push(currentEntry);
    if (isLikelyAbcTunebook(entries
      .map(entry => entry.sourceElt.textContent)
      .join('\n\n'))) {
      matchedEntries = entries.slice();
    }
    currentEntry = getNextRawAbcEntry(currentEntry);
  }
  return matchedEntries;
}

function rawAbcBlockRule(state, startLine, endLine, silent) {
  const firstLineStart = state.bMarks[startLine] + state.tShift[startLine];
  const firstLineEnd = state.eMarks[startLine];
  const firstLine = state.src.slice(firstLineStart, firstLineEnd);
  if (!/^X:\s*\S/.test(firstLine)) {
    return false;
  }

  const source = state.getLines(startLine, endLine, 0, false);
  const block = collectRawAbcBlock(source);
  if (!block) {
    return false;
  }
  if (silent) {
    return true;
  }

  const token = state.push('fence', 'code', 0);
  const sourceLines = source.split('\n');
  const trailingFenceLines = /^(?:```|~~~)\s*$/.test(sourceLines[block.nextLine] || '')
    ? 1
    : 0;
  token.info = 'abc';
  token.content = block.source;
  token.map = [startLine, startLine + block.nextLine + trailingFenceLines];
  token.markup = '';
  state.line = startLine + block.nextLine + trailingFenceLines;
  return true;
}

extensionSvc.onGetOptions((options, properties) => {
  options.abc = typeof properties.extensions.abc === 'object'
    ? properties.extensions.abc
    : { enabled: !!properties.extensions.abc };
});

extensionSvc.onInitConverter(5, (markdown, options) => {
  if (options.abc && options.abc.enabled) {
    markdown.block.ruler.before('paragraph', 'abc_raw_block', rawAbcBlockRule, {
      alt: ['paragraph', 'reference', 'blockquote'],
    });
  }
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
  elt.querySelectorAll('p')
    .cl_each((paragraphElt) => {
      if (!paragraphElt.parentNode) {
        return;
      }
      const entries = collectRawAbcEntries(paragraphElt);
      if (entries) {
        renderRawBlock(entries, options.abc);
      }
    });
});
