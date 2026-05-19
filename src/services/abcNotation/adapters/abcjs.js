import abcjs from 'abcjs/dist/abcjs-basic';
import {
  applyPostponedLyricsShim,
  collectStrictDiagnostics,
  normalizeDiagnostic,
  splitTunebook,
} from '../utils';

const { renderAbc } = abcjs;
const { SynthController, supportsAudio } = abcjs.synth;

function renderPlaybackMessage(targetElement, message, severity = 'warning') {
  const messageElt = document.createElement('div');
  messageElt.className = `abc-notation-playback-message abc-notation-playback-message--${severity}`;
  messageElt.textContent = message;
  targetElement.appendChild(messageElt);
}

export default {
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
    const renderedTunes = renderAbc(targetElement, tune.abc, renderOptions);
    [tune.renderedTune] = renderedTunes || [];
    return renderedTunes;
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
  renderPlaybackControls(tune, targetElement, options) {
    if (!tune.renderedTune) {
      renderPlaybackMessage(targetElement, 'Playback is unavailable until the tune renders.');
      return true;
    }
    if (!supportsAudio()) {
      renderPlaybackMessage(targetElement, 'Playback is not supported by this browser.');
      return true;
    }
    try {
      const controller = new SynthController();
      const controlOptions = {
        displayLoop: true,
        displayRestart: true,
        displayPlay: true,
        displayProgress: true,
        displayWarp: true,
        ...options.playbackOptions,
      };
      controller.load(targetElement, null, controlOptions);
      Promise.resolve(controller.setTune(tune.renderedTune, false, options.playbackOptions || {}))
        .catch((e) => {
          targetElement.innerHTML = '';
          renderPlaybackMessage(
            targetElement,
            `Playback initialization failed: ${e.message || e}`,
            'error',
          );
        });
      tune.playbackController = controller;
      return true;
    } catch (e) {
      renderPlaybackMessage(
        targetElement,
        `Playback initialization failed: ${e.message || e}`,
        'error',
      );
      return true;
    }
  },
};
