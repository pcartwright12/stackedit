export default {
  abcjs: {
    renderer: 'abcjs',
    supportsPlayback: true,
    supportsDiagnostics: true,
    knownLimitations: [
      'Some ABC 2.1 layout directives and abc2svg-specific extensions may render differently.',
      'Playback depends on browser Web Audio support and abcjs synth coverage.',
    ],
  },
  abc2svg: {
    renderer: 'abc2svg',
    supportsPlayback: false,
    supportsDiagnostics: true,
    knownLimitations: [
      'Optional LGPL-3.0 renderer that requires release license review.',
      'Playback controls are not available through the abc2svg adapter.',
    ],
  },
};
