const path = require('path');

// Vite's absolute base must become relative to each HTML/CSS file, NOT always
// './'. A stylesheet under assets/ needs ../assets/ or ../fonts/.
function rewritePackagedAssets(contents, filePath, appRoot) {
  const relativeRoot = path.relative(path.dirname(filePath), appRoot).split(path.sep).join('/');
  const prefix = relativeRoot ? relativeRoot + '/' : './';
  return contents.replace(/([("'=]\s*)\/api\/tv-app\//g, '$1' + prefix);
}

module.exports = { rewritePackagedAssets };