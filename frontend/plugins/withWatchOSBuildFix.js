// Fix: Xcode Dependency Cycle when watchOS target is embedded in main app
//
// ROOT CAUSE: CocoaPods adds [CP-User] script phases (Firebase Crashlytics, Google Mobile Ads)
// with inputPaths/outputPaths that create file-based dependency chains:
//   ProcessInfoPlistFile → Copy Watch App → [CP-User] scripts → dSYM → GenerateDSYMFile → Info.plist → CYCLE
//
// FIX: post_integrate hook that:
//   1. Clears inputPaths/outputPaths from [CP-User] script phases (breaks file dependency chain)
//   2. Sets always_out_of_date = "1" (scripts still run, but no dependency analysis)
//   3. Disables ENABLE_USER_SCRIPT_SANDBOXING (prevents sandbox errors for scripts without I/O)

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
# This MUST run after CocoaPods integrates (post_install is too early)
post_integrate do |installer|
  puts ""
  puts "======================================================"
  puts "[withWatchOSBuildFix] Fixing [CP-User] script phases..."
  puts "======================================================"

  require 'xcodeproj'
  project_path = File.join(__dir__, 'MegaRadio.xcodeproj')

  unless File.exist?(project_path)
    puts "[withWatchOSBuildFix] WARNING: project not found at #{project_path}"
    next
  end

  project = Xcodeproj::Project.open(project_path)
  fixed_count = 0

  project.targets.each do |target|
    next unless target.name == 'MegaRadio'

    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.name&.include?('[CP-User]')

      puts "[withWatchOSBuildFix] Fixing: #{phase.name}"
      puts "  Old inputPaths: #{phase.input_paths.to_a}"
      puts "  Old outputPaths: #{phase.output_paths.to_a}"

      # CRITICAL: Clear ALL file dependencies to break the dependency cycle
      # These inputPaths/outputPaths create implicit ordering that causes:
      #   [RNFB] Crashlytics → depends on dSYM → depends on binary → depends on Info.plist
      #   [RNGoogleMobileAds] → depends on Info.plist → circular with Watch App embed
      phase.input_paths.clear
      phase.output_paths.clear

      # Also clear file list paths if they exist
      begin
        phase.input_file_list_paths.clear if phase.input_file_list_paths
      rescue => e
        puts "  Could not clear input_file_list_paths: #{e.message}"
      end
      begin
        phase.output_file_list_paths.clear if phase.output_file_list_paths
      rescue => e
        puts "  Could not clear output_file_list_paths: #{e.message}"
      end

      # Set always_out_of_date so Xcode runs them every build
      # but does NOT include them in dependency analysis
      phase.always_out_of_date = "1"

      fixed_count += 1
      puts "  FIXED: cleared I/O paths + always_out_of_date"
    end

    # Also disable script sandboxing for the target (Xcode 15+)
    target.build_configurations.each do |bc|
      bc.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
  end

  project.save
  puts ""
  puts "[withWatchOSBuildFix] Done! Fixed #{fixed_count} [CP-User] script phases"
  puts "======================================================"
  puts ""
end
`;

      // Remove old post_integrate if exists, then add new one
      podfile = podfile.replace(/\n# Fix: Xcode Dependency Cycle[\s\S]*?^end\s*$/m, '');

      if (!podfile.includes('post_integrate do |installer|')) {
        // Append after the closing 'end' of the target block
        podfile = podfile.trimEnd() + '\n' + postIntegrateHook;
        fs.writeFileSync(podfilePath, podfile);
        console.log('[withWatchOSBuildFix] Added post_integrate hook to Podfile');
      } else {
        console.log('[withWatchOSBuildFix] post_integrate hook already exists');
      }

      return config;
    },
  ]);
};
