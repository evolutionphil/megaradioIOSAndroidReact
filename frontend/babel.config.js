module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Strip console.* from PRODUCTION builds only (dev keeps all logs).
  // Keep console.error/warn so crash diagnostics still surface.
  const isProduction =
    process.env.BABEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (isProduction) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  // react-native-reanimated/plugin MUST remain the LAST plugin in the array.
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
