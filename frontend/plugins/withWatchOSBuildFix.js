// Fix: Xcode Dependency Cycle when watchOS target is embedded in main app
//
// ROOT CAUSE: CocoaPods adds [CP-User] script phases with inputPaths that
// create file-based dependency chains causing cycles with Watch App embed.
//
// FIX: post_integrate hook clears inputPaths/outputPaths and sets alwaysOutOfDate.
// Ruby 4.0 compatible (nil-safe).

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

      // Remove any existing post_integrate block we previously added
      podfile = podfile.replace(/\n# Fix: Xcode Dependency Cycle[\s\S]*?^end\s*$/m, '');

      const postIntegrateHook = `

# Fix: Xcode Dependency Cycle with watchOS + Firebase/AdMob [CP-User] scripts
post_integrate do |installer|
  puts ""
  puts "======================================================"
  puts "[withWatchOSBuildFix] Fixing [CP-User] script phases..."
  puts "======================================================"

  require 'xcodeproj'
  project_path = File.join(__dir__, 'MegaRadio.xcodeproj')

  unless File.exist?(project_path)
    puts "[withWatchOSBuildFix] WARNING: project not found at \#{project_path}"
    next
  end

  project = Xcodeproj::Project.open(project_path)
  fixed_count = 0

  project.targets.each do |target|
    next unless target.name == 'MegaRadio'

    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.name && phase.name.include?('[CP-User]')

      puts "[withWatchOSBuildFix] Fixing: \#{phase.name}"

      # Clear inputPaths (nil-safe for Ruby 4.0)
      if phase.input_paths && phase.input_paths.respond_to?(:clear)
        puts "  Old inputPaths: \#{phase.input_paths.to_a}"
        phase.input_paths.clear
      end

      # Clear outputPaths (nil-safe)
      if phase.output_paths && phase.output_paths.respond_to?(:clear)
        phase.output_paths.clear
      end

      # Clear file list paths (nil-safe)
      if phase.respond_to?(:input_file_list_paths) && phase.input_file_list_paths && phase.input_file_list_paths.respond_to?(:clear)
        phase.input_file_list_paths.clear
      end
      if phase.respond_to?(:output_file_list_paths) && phase.output_file_list_paths && phase.output_file_list_paths.respond_to?(:clear)
        phase.output_file_list_paths.clear
      end

      phase.always_out_of_date = "1"
      fixed_count += 1
      puts "  FIXED: cleared I/O paths + always_out_of_date"
    end

    # Disable script sandboxing (Xcode 15+)
    target.build_configurations.each do |bc|
      bc.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    end
  end

  project.save
  puts ""
  puts "[withWatchOSBuildFix] Done! Fixed \#{fixed_count} [CP-User] script phases"
  puts "======================================================"
end
`;

      if (!podfile.includes('post_integrate do |installer|')) {
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
