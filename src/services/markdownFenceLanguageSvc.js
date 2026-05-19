import Prism from 'prismjs';

const insideFences = {};

function registerFenceLanguage(name, language) {
  if (Prism.util.type(language) === 'Object') {
    insideFences[`language-${name}`] = {
      pattern: new RegExp(`(\`\`\`|~~~)${name}\\W[\\s\\S]*`),
      inside: {
        'cl cl-pre': /(```|~~~).*/,
        rest: language,
      },
    };
  }
}

Object.entries(Prism.languages).forEach(([name, language]) => {
  registerFenceLanguage(name, language);
});

export default {
  insideFences,
  registerFenceLanguage,
};
