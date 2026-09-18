const { withProjectBuildGradle, withPodfile } = require('@expo/config-plugins');

// ffmpeg-kit-react-native ships as a "min" build by default, which lacks
// drawtext/freetype and the libx264 encoder we need for real exports.
// This plugin switches both platforms to the "full-gpl" flavor at
// `expo prebuild` time so the native projects never need manual edits.
const FLAVOR = 'full-gpl';

function withFfmpegKitFull(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy') {
      const marker = 'ext.ffmpegKitPackage';
      if (!mod.modResults.contents.includes(marker)) {
        mod.modResults.contents = mod.modResults.contents.replace(
          /allprojects\s*{/,
          `allprojects {\n    ext.ffmpegKitPackage = "${FLAVOR}"`
        );
      }
    }
    return mod;
  });

  config = withPodfile(config, (mod) => {
    const marker = "pod 'ffmpeg-kit-react-native'";
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents = mod.modResults.contents.replace(
        /use_react_native!\(/,
        `pod 'ffmpeg-kit-react-native', :subspecs => ['${FLAVOR}'], :podspec => '../node_modules/ffmpeg-kit-react-native/ffmpeg-kit-react-native.podspec'\n  use_react_native!(`
      );
    }
    return mod;
  });

  return config;
}

module.exports = withFfmpegKitFull;
