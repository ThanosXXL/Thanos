const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Erlaubt require('./assets/www/index.html'), damit der gebündelte
// Pharma-Tech-Prototyp per Asset.fromModule() in der WebView geladen werden kann.
config.resolver.assetExts.push('html');

module.exports = config;
