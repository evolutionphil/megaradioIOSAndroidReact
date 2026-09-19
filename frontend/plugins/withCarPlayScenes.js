// Own the complete iOS scene wiring so clean AND incremental prebuild are safe.
const { withAppDelegate, withInfoPlist, withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const sources = ['PhoneSceneDelegate.swift', 'CarPlaySceneDelegate.swift',
  'MegaRadioSceneCoordinator.swift', 'SiriPlayMediaHandler.swift'];

module.exports = function withCarPlayScenes(config) {
  config = withInfoPlist(config, cfg => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).PhoneSceneDelegate',
        }],
        CPTemplateApplicationSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'CarPlay',
          UISceneClassName: 'CPTemplateApplicationScene',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate',
        }],
      },
    };
    return cfg;
  });
  config = withAppDelegate(config, cfg => {
    if (cfg.modResults.language !== 'swift') throw new Error('CarPlay scenes require Swift AppDelegate');
    let contents = cfg.modResults.contents;
    // Expo template normally starts RN in an unattached window. PhoneSceneDelegate
    // now starts it in the actual UIWindowScene; CarPlay has its own lazy path.
    contents = contents.replace(/^\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*$/gm, '');
    // Expo54 closes the call INLINE after launchOptions; also accept older
    // multiline formatting. Fail closed instead of silently keeping two starts.
    contents = contents.replace(/^[ \t]*factory\.startReactNative\(\s*withModuleName:\s*"main",\s*in:\s*window,\s*launchOptions:\s*launchOptions\s*\)[ \t]*$/gm, '');
    if (contents.includes('factory.startReactNative(')) {
      throw new Error('CarPlay: unrecognized AppDelegate startup call; scene-owned startup required');
    }
    if (!contents.includes('MegaRadioSceneCoordinator.shared.launchOptions =')) {
      const anchor = 'let delegate = ReactNativeDelegate()';
      if (!contents.includes(anchor)) throw new Error('Unsupported AppDelegate: factory anchor missing');
      contents = contents.replace(anchor,
        'MegaRadioSceneCoordinator.shared.launchOptions = launchOptions ?? [:]\n    ' + anchor);
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
  return withXcodeProject(config, cfg => {
    const projectName = cfg.modRequest.projectName;
    const targetDir = path.join(cfg.modRequest.platformProjectRoot, projectName);
    fs.mkdirSync(targetDir, { recursive: true });
    for (const name of sources) {
      fs.copyFileSync(path.join(__dirname, 'ios', name), path.join(targetDir, name));
      if (!cfg.modResults.hasFile(`${projectName}/${name}`)) {
        IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
          filepath: `${projectName}/${name}`, groupName: projectName,
          project: cfg.modResults,
        });
      }
    }
    const header = path.join(targetDir, `${projectName}-Bridging-Header.h`);
    const contents = fs.existsSync(header) ? fs.readFileSync(header, 'utf8') : '';
    if (!contents.includes('#import <RNCarPlay/RNCarPlay.h>')) {
      fs.writeFileSync(header, contents + '\n#import <RNCarPlay/RNCarPlay.h>\n');
    }
    return cfg;
  });
};