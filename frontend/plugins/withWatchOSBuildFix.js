// Fix: Xcode Dependency Cycle when watchOS target is embedded in main app
// The cycle occurs because CocoaPods [CP-User] script phases (Firebase Crashlytics,
// Google Mobile Ads) create implicit file dependencies that conflict with the
// "Embed Watch Content" copy phase and ProcessInfoPlistFile.
//
// Solution: Add a post_integrate hook to the Podfile that sets always_out_of_date="1"
// on all CocoaPods script phases. This tells Xcode to always run them but NOT to
// include them in dependency analysis, breaking the cycle.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withWatchOSBuildFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');

      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      const postIntegrateHook = `

# Fix: Xcode Dependency Cycle with watchOS + Firebase/AdMob [CP-User] scripts
post_integrate do |installer|
  # Access the main Xcode project
  main_project = installer.aggregate_targets[0]&.user_project
  next unless main_project

  main_project.targets.each do |target|
    run_script_phases = target.build_phases.select { |phase|
      phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
    }

    cocoapods_phases = run_script_phases.select { |phase|
      phase.name&.start_with?("[CP")
    }

    cocoapods_phases.each do |phase|
      # Set always_out_of_date to prevent Xcode dependency analysis
      # This breaks cycles between [CP-User] scripts, ProcessInfoPlistFile,
      # and Watch App embed/copy phases
      phase.always_out_of_date = "1"
    end
  end

  main_project.save
  puts "[withWatchOSBuildFix] Fixed CocoaPods script phases to prevent dependency cycles"
end
`;

      if (!podfile.includes('post_integrate do |installer|')) {
        // Append after the last 'end' (which closes the target block)
        podfile = podfile.trimEnd() + '\n' + postIntegrateHook;
        fs.writeFileSync(podfilePath, podfile);
        console.log('[withWatchOSBuildFix] Added post_integrate hook to Podfile');
      } else {
        console.log('[withWatchOSBuildFix] post_integrate hook already exists, skipping');
      }

      return config;
    },
  ]);
};
