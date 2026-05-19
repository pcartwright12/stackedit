const headerPattern = /^([A-Za-z]):\s*(.*)$/;
const directivePattern = /^%%/;
const lyricLinePattern = /^w:/;
const bodyFieldPattern = /^[A-Za-z]:/;
const requiredHeaderFields = ['X', 'T', 'K'];

export function normalizeSource(source = '') {
  return `${source || ''}`.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
}

function getLineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function extractHeaderInfo(abc) {
  const info = {
    fields: {},
    firstField: null,
    headerEndLine: null,
  };
  const lines = normalizeSource(abc).split('\n');
  lines.some((line, index) => {
    const match = headerPattern.exec(line);
    if (!match) {
      if (line.trim() && !directivePattern.test(line)) {
        info.headerEndLine = index + 1;
        return true;
      }
      return false;
    }
    if (!info.firstField) {
      [info.firstField] = match.slice(1);
    }
    info.fields[match[1]] = info.fields[match[1]] || [];
    info.fields[match[1]].push({
      line: index + 1,
      value: match[2],
    });
    if (match[1] === 'K') {
      info.headerEndLine = index + 1;
      return true;
    }
    return false;
  });
  return info;
}

export function splitTunebook(source = '') {
  const normalizedSource = normalizeSource(source).replace(/\s+$/g, '');
  if (!normalizedSource) {
    return [];
  }
  const matches = [];
  const matcher = /^X:.*$/gm;
  for (let match = matcher.exec(normalizedSource); match; match = matcher.exec(normalizedSource)) {
    matches.push({
      index: match.index,
      line: getLineNumber(normalizedSource, match.index),
    });
  }
  if (!matches.length) {
    const headerInfo = extractHeaderInfo(normalizedSource);
    return [{
      abc: normalizedSource,
      pure: normalizedSource,
      index: 0,
      startLine: 1,
      id: '',
      title: ((headerInfo.fields.T || [])[0] || {}).value || '',
    }];
  }

  const prelude = normalizedSource.slice(0, matches[0].index);
  const sharedDirectives = prelude
    .split('\n')
    .filter(line => directivePattern.test(line))
    .join('\n');
  return matches.map((current, index) => {
    const next = matches[index + 1];
    const pure = normalizedSource.slice(current.index, next ? next.index : undefined)
      .replace(/\s+$/g, '');
    const headerInfo = extractHeaderInfo(pure);
    return {
      abc: `${sharedDirectives ? `${sharedDirectives}\n` : ''}${pure}`,
      pure,
      index,
      startLine: current.line,
      id: ((headerInfo.fields.X || [])[0] || {}).value || '',
      title: ((headerInfo.fields.T || [])[0] || {}).value || '',
    };
  });
}

export function collectStrictDiagnostics(tune) {
  const diagnostics = [];
  const headerInfo = extractHeaderInfo(tune.pure || tune.abc);
  if (headerInfo.firstField && headerInfo.firstField !== 'X') {
    diagnostics.push({
      severity: 'warning',
      line: tune.startLine,
      message: 'ABC 2.1 tunes should begin with an X: reference number.',
    });
  }
  requiredHeaderFields.forEach((field) => {
    if (!headerInfo.fields[field]) {
      diagnostics.push({
        severity: 'warning',
        line: tune.startLine,
        message: `Missing required ABC header field ${field}:.`,
      });
    }
  });
  if (headerInfo.fields.K && headerInfo.fields.T &&
    headerInfo.fields.K[0].line < headerInfo.fields.T[0].line) {
    diagnostics.push({
      severity: 'warning',
      line: tune.startLine + (headerInfo.fields.K[0].line - 1),
      message: 'K: should end the tune header after title and other metadata fields.',
    });
  }
  return diagnostics;
}

function isMusicLine(line) {
  const trimmedLine = line.trim();
  return !!trimmedLine &&
    !directivePattern.test(trimmedLine) &&
    !bodyFieldPattern.test(trimmedLine) &&
    !/^%/.test(trimmedLine);
}

export function applyPostponedLyricsShim(abc) {
  const lines = normalizeSource(abc).split('\n');
  let lyricStart = lines.length;
  while (
    lyricStart > 0 &&
    (lyricLinePattern.test(lines[lyricStart - 1]) || !lines[lyricStart - 1].trim())
  ) {
    lyricStart -= 1;
  }
  const lyricLines = lines.slice(lyricStart).filter(line => lyricLinePattern.test(line));
  if (!lyricLines.length) {
    return abc;
  }
  const musicLineIndex = lines.slice(0, lyricStart).findIndex(isMusicLine);
  if (musicLineIndex < 0) {
    return abc;
  }
  const beforeLyrics = lines.slice(0, lyricStart);
  const nextLine = beforeLyrics[musicLineIndex + 1] || '';
  if (lyricLinePattern.test(nextLine)) {
    return abc;
  }
  return beforeLyrics
    .slice(0, musicLineIndex + 1)
    .concat(lyricLines, beforeLyrics.slice(musicLineIndex + 1))
    .join('\n');
}

export function normalizeRendererOptions(options = {}) {
  const normalized = {
    responsive: options.responsive === false ? undefined : 'resize',
    strict: options.strict !== false,
    renderer: options.renderer || 'abcjs',
    playback: !!options.playback,
    fixPostponedLyrics: options.fixPostponedLyrics !== false,
  };
  if (options.staffWidth) {
    normalized.staffwidth = parseInt(options.staffWidth, 10);
  }
  if (options.scale) {
    normalized.scale = parseFloat(options.scale);
  }
  if (options.print) {
    normalized.print = true;
  }
  return normalized;
}
