module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage/async-storage|react-native-background-actions)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
