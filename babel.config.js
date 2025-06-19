module.exports = function (api) {
  api.cache(true);
  let plugins = [['inline-import', { extensions: ['.sql'] }]];

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
