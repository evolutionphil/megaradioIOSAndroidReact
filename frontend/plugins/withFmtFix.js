// Fix: fmt consteval error with Xcode 16.4+ Clang C++20 strictness
// The fmt library (pulled by React Native's Folly) fails with C++20 consteval rules.
// This plugin downgrades ONLY the fmt pod to C++17.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFmtFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');

      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      const fmtFix = `
    # Fix: fmt consteval error with Xcode 16.4+
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end`;

      if (!podfile.includes("target.name == 'fmt'")) {
        // Insert before the last 'end' of post_install block
        podfile = podfile.replace(
          /^(\s*react_native_post_install\([\s\S]*?\)\s*$)/m,
          `$1\n${fmtFix}`
        );
        fs.writeFileSync(podfilePath, podfile);
        console.log('[withFmtFix] Added fmt C++17 fix to Podfile');
      }

      return config;
    },
  ]);
};
