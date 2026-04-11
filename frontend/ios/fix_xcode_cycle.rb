#!/usr/bin/env ruby
# Fix Xcode Dependency Cycle with watchOS + CocoaPods [CP-User] script phases
#
# Usage: After 'pod install', run:
#   cd ios
#   ruby fix_xcode_cycle.rb
#
# What it does:
#   - Clears inputPaths/outputPaths from [CP-User] script phases
#   - Sets always_out_of_date = "1"
#   - Disables ENABLE_USER_SCRIPT_SANDBOXING
#
# Why: [RNFB] Crashlytics and [RNGoogleMobileAds] scripts create file dependencies
# (dSYM, Info.plist) that form a cycle with the Watch App embed phase.

require 'xcodeproj'

project_path = File.join(__dir__, 'MegaRadio.xcodeproj')

unless File.exist?(project_path)
  puts "ERROR: #{project_path} not found. Are you in the ios/ directory?"
  exit 1
end

project = Xcodeproj::Project.open(project_path)
fixed_count = 0

project.targets.each do |target|
  next unless target.name == 'MegaRadio'

  puts "Target: #{target.name}"

  target.build_phases.each do |phase|
    next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
    next unless phase.name&.include?('[CP-User]')

    puts "  Fixing: #{phase.name}"
    puts "    inputPaths: #{phase.input_paths.to_a}"
    puts "    outputPaths: #{phase.output_paths.to_a}"

    phase.input_paths.clear
    phase.output_paths.clear

    begin
      phase.input_file_list_paths.clear if phase.input_file_list_paths
    rescue; end
    begin
      phase.output_file_list_paths.clear if phase.output_file_list_paths
    rescue; end

    phase.always_out_of_date = "1"

    fixed_count += 1
    puts "    FIXED"
  end

  target.build_configurations.each do |bc|
    bc.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    puts "  #{bc.name}: ENABLE_USER_SCRIPT_SANDBOXING = NO"
  end
end

project.save
puts ""
puts "Done! Fixed #{fixed_count} [CP-User] script phases."
puts "Now open Xcode and build again."
