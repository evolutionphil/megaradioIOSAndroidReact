const { withXcodeProject, withMainApplication, withAppBuildGradle, withAndroidManifest, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withCompanionBridges(config) {
  config = withXcodeProject(config, c => {
    const name = c.modRequest.projectName;
    for (const file of ['WatchConnectivityBridge.swift', 'WatchConnectivityBridge.m', 'WatchConnectivityHandler.swift']) {
      fs.copyFileSync(path.join(c.modRequest.projectRoot, 'watch/ios', file), path.join(c.modRequest.platformProjectRoot, name, file));
      if (!c.modResults.hasFile(`${name}/${file}`)) IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: `${name}/${file}`, groupName: name, project: c.modResults,
      });
    }
    return c;
  });
  config = withMainApplication(config, c => {
    if (!c.modResults.contents.includes('add(com.megaradio.wearbridge.WearDataLayerPackage())')) {
      const anchor = 'PackageList(this).packages.apply {';
      if (!c.modResults.contents.includes(anchor)) throw new Error('Wear bridge: unsupported MainApplication template');
      c.modResults.contents = c.modResults.contents.replace(anchor, `${anchor}\n              add(com.megaradio.wearbridge.WearDataLayerPackage())`);
    }
    return c;
  });
  config = withAppBuildGradle(config, c => {
    if (!c.modResults.contents.includes('com.google.android.gms:play-services-wearable:')) {
      if (!c.modResults.contents.includes('dependencies {')) throw new Error('Wear bridge: dependencies block missing');
      // Match the existing Wear companion's tested dependency, not an unrelated upgrade.
      c.modResults.contents = c.modResults.contents.replace('dependencies {', 'dependencies {\n    implementation("com.google.android.gms:play-services-wearable:18.1.0")');
    }
    return c;
  });
  config = withAndroidManifest(config, c => {
    const application = c.modResults.manifest.application[0];
    application.service = application.service || [];
    const name = 'com.megaradio.wearbridge.PhoneWearListenerService';
    if (!application.service.some(service => service.$?.['android:name'] === name)) {
      application.service.push({ $: { 'android:name': name, 'android:exported': 'true' }, 'intent-filter': [{
        action: [{ $: { 'android:name': 'com.google.android.gms.wearable.MESSAGE_RECEIVED' } }],
        data: [{ $: { 'android:scheme': 'wear', 'android:host': '*', 'android:pathPrefix': '/megaradio/command/' } }],
      }] });
    }
    return c;
  });
  return withDangerousMod(config, ['android', async c => {
    const target = path.join(c.modRequest.platformProjectRoot, 'app/src/main/java/com/megaradio/wearbridge');
    fs.mkdirSync(target, { recursive: true });
    for (const file of ['WearDataLayerModule.kt', 'WearDataLayerPackage.kt', 'PhoneWearListenerService.kt']) {
      fs.copyFileSync(path.join(__dirname, 'android', file), path.join(target, file));
    }
    return c;
  }]);
};