module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push([
    'react-native-unistyles/plugin',
    {
      autoProcessRoot: 'app',
      autoProcessImports: ['~/components'],
    },
  ]);

  return {
    presets: ['babel-preset-expo'],

    plugins,
  };
};
