const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons'],
      },
    },
    argv
  );

  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native': 'react-native-web',
    'react-native-vector-icons': 'react-native-vector-icons/dist',
  };

  return config;
};
