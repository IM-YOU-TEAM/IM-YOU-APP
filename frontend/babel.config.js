module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Vision Camera 4 frame processors run the pose model. This plugin has to be present or they no-op.
    plugins: ['react-native-worklets-core/plugin'],
  };
};
