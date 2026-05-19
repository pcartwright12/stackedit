function getPathValue(context, path) {
  return path.split('.').reduce((value, key) => {
    if (value === undefined || value === null) {
      return '';
    }
    return value[key];
  }, context);
}

module.exports = class TemplateWorkerMock {
  addEventListener(type, listener) {
    if (type === 'message') {
      this.listener = listener;
    }
  }

  postMessage([template, context]) {
    const result = template.replace(/\{\{\{\s*([^}]+?)\s*\}\}\}/g, (match, path) =>
      getPathValue(context, path));
    this.listener({
      data: [null, result],
    });
  }

  terminate() {}
};
