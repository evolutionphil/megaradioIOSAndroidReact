// withAndroidAppActions - Google Assistant App Actions ("Hey Google, play MegaRadio")
// Writes res/xml/assistant_shortcuts.xml (actions.intent.PLAY_MUSIC capability →
// megaradio://?playLast=1 deep link) and registers it on MainActivity during prebuild.
const { withDangerousMod, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const XML_NAME = 'assistant_shortcuts.xml';

const buildXml = (pkg) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <capability android:name="actions.intent.PLAY_MUSIC">
    <intent
      android:action="android.intent.action.VIEW"
      android:targetPackage="${pkg}"
      android:targetClass="${pkg}.MainActivity">
      <url-template android:value="megaradio://?playLast=1" />
    </intent>
  </capability>
</shortcuts>
`;

const withAndroidAppActions = (config) => {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const pkg = config.android.package;
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, XML_NAME), buildXml(pkg));
      console.log('[withAndroidAppActions] Wrote res/xml/' + XML_NAME);
      return config;
    },
  ]);

  config = withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    mainActivity['meta-data'] = mainActivity['meta-data'] || [];
    const exists = mainActivity['meta-data'].some(
      (m) => m.$['android:name'] === 'android.app.shortcuts'
    );
    if (!exists) {
      mainActivity['meta-data'].push({
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/assistant_shortcuts',
        },
      });
      console.log('[withAndroidAppActions] Registered android.app.shortcuts on MainActivity');
    }
    return config;
  });

  return config;
};

module.exports = withAndroidAppActions;
