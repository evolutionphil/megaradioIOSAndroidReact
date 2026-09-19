const fs = require('fs');
const path = require('path');
const { withPodfile } = require('@expo/config-plugins');

module.exports = function withSwiftAudioExRadioFix(config) {
  const pkg = require('react-native-track-player/package.json');
  const root = path.dirname(require.resolve('react-native-track-player/package.json'));
  const podspec = fs.readFileSync(path.join(root, 'react-native-track-player.podspec'), 'utf8');
  if (pkg.version !== '4.1.2' || !/dependency ["']SwiftAudioEx["'], ["']1\.1\.0["']/.test(podspec)) {
    throw new Error('Review SwiftAudioEx radio fix for the new TrackPlayer version before building');
  }
  return withPodfile(config, cfg => {
    const marker = '# MegaRadio SwiftAudioEx live-radio fix';
    if (!cfg.modResults.contents.includes(marker)) {
      const anchor = /post_install do \|installer\|/;
      if (!anchor.test(cfg.modResults.contents)) throw new Error('Podfile post_install hook missing');
      cfg.modResults.contents = cfg.modResults.contents.replace(anchor, match => `${match}
    ${marker}
    radio_patch = File.join(__dir__, '..', 'scripts', 'patch-swiftaudioex.js')
    unless system('node', radio_patch, installer.sandbox.root.to_s)
      raise 'MegaRadio SwiftAudioEx patch failed; refusing to build the unpatched player'
    end`);
    }
    return cfg;
  });
};