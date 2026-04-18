#!/usr/bin/env node
/**
 * fix-xcode-cycle.js
 * 
 * Fixes Xcode Dependency Cycle caused by [CP-User] script phases
 * (Firebase Crashlytics + Google Mobile Ads) conflicting with watchOS embed.
 * 
 * MUST run AFTER `pod install` (which creates the [CP-User] phases).
 * 
 * Usage:
 *   cd frontend
 *   npx expo prebuild --platform ios --clean
 *   cd ios && pod install && cd ..
 *   node scripts/fix-xcode-cycle.js      <-- RUN THIS
 *   # Then open Xcode and build/archive
 * 
 * What it does:
 *   1. Clears inputPaths/outputPaths from [CP-User] script phases
 *   2. Adds alwaysOutOfDate = 1
 *   3. Sets ENABLE_USER_SCRIPT_SANDBOXING = NO
 */

const fs = require('fs');
const path = require('path');

const pbxprojPath = path.join(__dirname, '..', 'ios', 'MegaRadio.xcodeproj', 'project.pbxproj');

if (!fs.existsSync(pbxprojPath)) {
  console.error('ERROR: project.pbxproj not found at:', pbxprojPath);
  console.error('Make sure you ran: npx expo prebuild --platform ios --clean && cd ios && pod install');
  process.exit(1);
}

console.log('');
console.log('======================================================');
console.log('[fix-xcode-cycle] Reading project.pbxproj...');
console.log('======================================================');

let content = fs.readFileSync(pbxprojPath, 'utf-8');
const originalContent = content;

// ============================================================
// STEP 1: Fix [CP-User] script phases — clear inputPaths/outputPaths
// ============================================================

// Parse the file line by line to find and modify [CP-User] blocks
const lines = content.split('\n');
let inCPUserBlock = false;
let blockBraceDepth = 0;
let inInputPaths = false;
let inOutputPaths = false;
let inInputFileListPaths = false;
let inOutputFileListPaths = false;
let fixedPhases = [];
let currentPhaseName = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // Detect entering a [CP-User] block
  // Format: HASH /* [CP-User] ... */ = {
  if (!inCPUserBlock && trimmed.includes('[CP-User]') && trimmed.endsWith('= {')) {
    inCPUserBlock = true;
    blockBraceDepth = 1;
    currentPhaseName = trimmed.match(/\/\*\s*(.+?)\s*\*\//)?.[1] || 'Unknown';
    console.log(`\nFound: ${currentPhaseName}`);
    continue;
  }

  if (!inCPUserBlock) continue;

  // Track brace depth
  const openBraces = (line.match(/\{/g) || []).length;
  const closeBraces = (line.match(/\}/g) || []).length;
  blockBraceDepth += openBraces - closeBraces;

  // Exiting the block
  if (blockBraceDepth <= 0) {
    inCPUserBlock = false;
    fixedPhases.push(currentPhaseName);
    continue;
  }

  // Add alwaysOutOfDate after isa line if not present
  if (trimmed === 'isa = PBXShellScriptBuildPhase;') {
    // Check if next line already has alwaysOutOfDate
    const nextLine = (lines[i + 1] || '').trim();
    if (!nextLine.includes('alwaysOutOfDate')) {
      // Insert alwaysOutOfDate after this line
      const indent = line.match(/^(\s*)/)[1];
      lines.splice(i + 1, 0, `${indent}alwaysOutOfDate = 1;`);
      console.log('  + Added alwaysOutOfDate = 1');
    }
  }

  // Detect and clear inputPaths = ( ... );
  if (trimmed.startsWith('inputPaths') && trimmed.includes('(')) {
    inInputPaths = true;
    if (trimmed.endsWith(');')) {
      // Single line: inputPaths = ();
      lines[i] = line.replace(/inputPaths = \([^)]*\);/, 'inputPaths = (\n\t\t\t);');
      inInputPaths = false;
      console.log('  - Cleared inputPaths (single line)');
    } else {
      // Multi-line: inputPaths = (
      lines[i] = line.replace(/inputPaths = \(.*/, 'inputPaths = (');
      console.log('  - Clearing inputPaths (multi-line)...');
    }
    continue;
  }
  if (inInputPaths) {
    if (trimmed === ');' || trimmed === ')') {
      inInputPaths = false;
    } else {
      // Remove the input path entry (replace with empty)
      console.log(`    Removed: ${trimmed}`);
      lines[i] = '';
    }
    continue;
  }

  // Detect and clear outputPaths = ( ... );
  if (trimmed.startsWith('outputPaths') && trimmed.includes('(')) {
    inOutputPaths = true;
    if (trimmed.endsWith(');')) {
      lines[i] = line.replace(/outputPaths = \([^)]*\);/, 'outputPaths = (\n\t\t\t);');
      inOutputPaths = false;
      console.log('  - Cleared outputPaths (single line)');
    } else {
      lines[i] = line.replace(/outputPaths = \(.*/, 'outputPaths = (');
      console.log('  - Clearing outputPaths (multi-line)...');
    }
    continue;
  }
  if (inOutputPaths) {
    if (trimmed === ');' || trimmed === ')') {
      inOutputPaths = false;
    } else {
      console.log(`    Removed: ${trimmed}`);
      lines[i] = '';
    }
    continue;
  }

  // Same for inputFileListPaths
  if (trimmed.startsWith('inputFileListPaths') && trimmed.includes('(')) {
    inInputFileListPaths = true;
    if (trimmed.endsWith(');')) {
      lines[i] = line.replace(/inputFileListPaths = \([^)]*\);/, 'inputFileListPaths = (\n\t\t\t);');
      inInputFileListPaths = false;
    } else {
      lines[i] = line.replace(/inputFileListPaths = \(.*/, 'inputFileListPaths = (');
    }
    continue;
  }
  if (inInputFileListPaths) {
    if (trimmed === ');' || trimmed === ')') {
      inInputFileListPaths = false;
    } else {
      lines[i] = '';
    }
    continue;
  }

  // Same for outputFileListPaths
  if (trimmed.startsWith('outputFileListPaths') && trimmed.includes('(')) {
    inOutputFileListPaths = true;
    if (trimmed.endsWith(');')) {
      lines[i] = line.replace(/outputFileListPaths = \([^)]*\);/, 'outputFileListPaths = (\n\t\t\t);');
      inOutputFileListPaths = false;
    } else {
      lines[i] = line.replace(/outputFileListPaths = \(.*/, 'outputFileListPaths = (');
    }
    continue;
  }
  if (inOutputFileListPaths) {
    if (trimmed === ');' || trimmed === ')') {
      inOutputFileListPaths = false;
    } else {
      lines[i] = '';
    }
    continue;
  }
}

content = lines.filter(l => l !== '').join('\n');

// ============================================================
// STEP 2: Disable User Script Sandboxing (Xcode 15+)
// ============================================================

// Add ENABLE_USER_SCRIPT_SANDBOXING = NO to all build configurations
content = content.replace(
  /ENABLE_STRICT_OBJC_MSGSEND = YES;/g,
  'ENABLE_STRICT_OBJC_MSGSEND = YES;\n\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = NO;'
);
console.log('\n+ Set ENABLE_USER_SCRIPT_SANDBOXING = NO');

// ============================================================
// STEP 3: Write the fixed file
// ============================================================

if (content !== originalContent) {
  fs.writeFileSync(pbxprojPath, content);
  console.log('');
  console.log('======================================================');
  console.log(`[fix-xcode-cycle] DONE! Fixed ${fixedPhases.length} [CP-User] phases:`);
  fixedPhases.forEach(name => console.log(`  - ${name}`));
  console.log('');
  console.log('Next steps:');
  console.log('  1. Xcode: Product > Clean Build Folder (Cmd+Shift+K)');
  console.log('  2. rm -rf ~/Library/Developer/Xcode/DerivedData/MegaRadio-*');
  console.log('  3. Build/Archive again');
  console.log('======================================================');
  console.log('');
} else {
  console.log('');
  console.log('[fix-xcode-cycle] No [CP-User] phases found. Nothing to fix.');
  console.log('Make sure you ran "pod install" first.');
  console.log('');
}
