// withSplashScreenFix.js
// Fix: Native iOS LaunchScreen/SplashScreen storyboard
// - Set background color to black (#000000)
// - Use "scaleAspectFill" instead of "scaleAspectFit" for full-screen splash
// - Reference the correct splash image asset

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSplashScreenFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const storyboardPath = path.join(
        config.modRequest.projectRoot,
        'ios/MegaRadio/SplashScreen.storyboard'
      );

      if (!fs.existsSync(storyboardPath)) {
        console.log('[withSplashScreenFix] SplashScreen.storyboard not found');
        return config;
      }

      let content = fs.readFileSync(storyboardPath, 'utf-8');

      // 1. Change background from systemBackgroundColor (white) to pure black
      content = content.replace(
        /<color key="backgroundColor" systemColor="systemBackgroundColor"\/>/,
        '<color key="backgroundColor" red="0" green="0" blue="0" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>'
      );

      // 2. Change image contentMode from scaleAspectFit to scaleAspectFill for full coverage
      content = content.replace(
        /contentMode="scaleAspectFit"/,
        'contentMode="scaleAspectFill"'
      );

      // 3. Remove fixed size constraints and make image fill the entire screen
      // Replace the centered small image with a full-screen fill
      content = content.replace(
        /<imageView clipsSubviews="YES" userInteractionEnabled="NO" contentMode="scaleAspectFill"[^>]*id="EXPO-SplashScreen"[^>]*>[^<]*<rect key="frame"[^/]*\/>/,
        (match) => {
          // Update to full screen frame
          return match.replace(
            /<rect key="frame"[^/]*\/>/,
            '<rect key="frame" x="0" y="0" width="393" height="852"/>'
          );
        }
      );

      // 4. Replace centering constraints with edge-pinning constraints (fill screen)
      content = content.replace(
        /<constraints>\s*<constraint firstItem="EXPO-SplashScreen" firstAttribute="centerY"[^/]*\/>\s*<constraint firstItem="EXPO-SplashScreen" firstAttribute="centerX"[^/]*\/>\s*<\/constraints>/,
        `<constraints>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="splashTop"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="splashBottom"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="splashLeading"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="splashTrailing"/>
                        </constraints>`
      );

      // 5. Fix the systemBackgroundColor in resources section
      content = content.replace(
        /<systemColor name="systemBackgroundColor">\s*<color white="1"[^/]*\/>\s*<\/systemColor>/,
        '<systemColor name="systemBackgroundColor">\n            <color red="0" green="0" blue="0" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>\n        </systemColor>'
      );

      fs.writeFileSync(storyboardPath, content);
      console.log('[withSplashScreenFix] Fixed SplashScreen.storyboard: black bg + full-screen image');

      return config;
    },
  ]);
};
