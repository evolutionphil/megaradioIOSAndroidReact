const { prepareRenderer } = require('./build/prepare-renderer');
module.exports = { ...require('./package.json').build, beforePack: async () => { prepareRenderer(); } };