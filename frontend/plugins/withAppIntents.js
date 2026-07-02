// withAppIntents - injects MegaRadioAppIntents.swift (App Shortcuts / Siri iOS 16+)
// into the generated Xcode project during `expo prebuild`
const { withXcodeProject, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SWIFT_FILE = 'MegaRadioAppIntents.swift';

const withAppIntents = (config) => {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const src = path.join(config.modRequest.projectRoot, 'plugins', 'ios', SWIFT_FILE);
      const dest = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName,
        SWIFT_FILE
      );
      fs.copyFileSync(src, dest);
      console.log('[withAppIntents] Copied', SWIFT_FILE, 'into iOS project');
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName;
    const relPath = `${projectName}/${SWIFT_FILE}`;
    if (!project.hasFile(relPath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relPath,
        groupName: projectName,
        project,
      });
      console.log('[withAppIntents] Added', relPath, 'to Xcode build sources');
    }
    return config;
  });

  return config;
};

module.exports = withAppIntents;
