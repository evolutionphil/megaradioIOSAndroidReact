// Expo Config Plugin: Fix react-native-track-player TurboModule compatibility
// 
// Problem: MusicModule.kt methods use `= scope.launch { }` which returns `Job` (non-void).
// React Native 0.81+ TurboModule interop parser crashes because it expects `void/Unit` return type
// for async methods (methods with Promise parameter).
//
// Fix: Transform `fun method(...) = scope.launch { ... }` to `fun method(...) { scope.launch { ... } }`
// This changes the return type from Job to Unit, making it TurboModule-compatible.
//
// Also fixes MusicService.kt startForeground crash on Android 15+.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function fixMusicModuleTurboModule(projectRoot) {
  const filePath = path.join(
    projectRoot,
    'node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt'
  );

  if (!fs.existsSync(filePath)) {
    console.log('[withTrackPlayerNewArchFix] MusicModule.kt not found, skipping');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already fixed
  if (content.includes('// TURBO_MODULE_FIX_APPLIED')) {
    console.log('[withTrackPlayerNewArchFix] MusicModule.kt already fixed');
    return;
  }

  const lines = content.split('\n');
  const result = [];
  let scopeLaunchDepth = 0;
  let insideScopeLaunch = false;
  let pendingMultilineEquals = false;
  let fixCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle multiline case: previous line ended with `=`
    if (pendingMultilineEquals) {
      const trimmed = line.trim();
      if (trimmed.startsWith('scope.launch {') || trimmed.startsWith('scope.launch{')) {
        // Don't change scope.launch line, but we already changed `=` to `{` on prev line
        result.push(line);
        insideScopeLaunch = true;
        scopeLaunchDepth = 1; // Only count scope.launch's opening brace
        pendingMultilineEquals = false;
        fixCount++;
        continue;
      } else {
        // Not a scope.launch after =, revert
        pendingMultilineEquals = false;
      }
    }

    // Single line case: `fun method(...) = scope.launch {`
    if (line.includes('= scope.launch {') || line.includes('= scope.launch{')) {
      const fixed = line.replace(/=\s*scope\.launch\s*\{/, '{ scope.launch {');
      result.push(fixed);
      insideScopeLaunch = true;
      // Only count from scope.launch's opening brace, NOT the function body brace
      scopeLaunchDepth = 1;
      fixCount++;
      continue;
    }

    // Check for multiline: line ends with `) =` or `) =\n` before scope.launch on next line
    if (line.trimEnd().endsWith(') =') || line.trimEnd().endsWith(')=')) {
      // Replace trailing `=` with `{`
      const fixed = line.replace(/\)\s*=\s*$/, ') {');
      result.push(fixed);
      pendingMultilineEquals = true;
      continue;
    }

    // Track brace depth inside scope.launch block
    if (insideScopeLaunch) {
      for (const char of line) {
        if (char === '{') scopeLaunchDepth++;
        if (char === '}') scopeLaunchDepth--;
      }

      if (scopeLaunchDepth === 0) {
        // scope.launch block has closed, add extra } for the outer function body
        const trimmed = line.trimEnd();
        if (trimmed.endsWith('}')) {
          result.push(line);
          // Add extra closing brace for the function body
          const indent = line.match(/^(\s*)/)[1];
          result.push(indent + '}');
        } else {
          result.push(line);
        }
        insideScopeLaunch = false;
        continue;
      }
    }

    result.push(line);
  }

  // Add marker to prevent re-application
  result.unshift('// TURBO_MODULE_FIX_APPLIED');

  fs.writeFileSync(filePath, result.join('\n'));
  console.log(`[withTrackPlayerNewArchFix] Fixed ${fixCount} methods in MusicModule.kt for TurboModule compatibility`);
}

function fixMusicServiceForeground(projectRoot) {
  const filePath = path.join(
    projectRoot,
    'node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/service/MusicService.kt'
  );

  if (!fs.existsSync(filePath)) {
    console.log('[withTrackPlayerNewArchFix] MusicService.kt not found, skipping');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already fixed
  if (content.includes('// FOREGROUND_SERVICE_FIX_APPLIED')) {
    console.log('[withTrackPlayerNewArchFix] MusicService.kt already fixed');
    return;
  }

  // Fix 1: Wrap startAndStopEmptyNotificationToAvoidANR in try-catch
  if (!content.includes('startForeground failed (likely background restriction')) {
    // The original code calls startForeground directly without try-catch
    // Replace the entire method body with try-catch wrapped version
    const originalPattern = `private fun startAndStopEmptyNotificationToAvoidANR() {
        val notificationManager = this.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notificationManager.createNotificationChannel(
                NotificationChannel(getString(TrackPlayerR.string.rntp_temporary_channel_id), getString(TrackPlayerR.string.rntp_temporary_channel_name), NotificationManager.IMPORTANCE_LOW)
            )
        }

        val notificationBuilder = NotificationCompat.Builder(this, getString(TrackPlayerR.string.rntp_temporary_channel_id))
            .setPriority(PRIORITY_LOW)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setSmallIcon(ExoPlayerR.drawable.exo_notification_small_icon)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            notificationBuilder.foregroundServiceBehavior = NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE
        }
        val notification = notificationBuilder.build()
        startForeground(EMPTY_NOTIFICATION_ID, notification)
        @Suppress("DEPRECATION")
        stopForeground(true)
    }`;

    const fixedMethod = `private fun startAndStopEmptyNotificationToAvoidANR() {
        try {
            val notificationManager = this.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                notificationManager.createNotificationChannel(
                    NotificationChannel(getString(TrackPlayerR.string.rntp_temporary_channel_id), getString(TrackPlayerR.string.rntp_temporary_channel_name), NotificationManager.IMPORTANCE_LOW)
                )
            }

            val notificationBuilder = NotificationCompat.Builder(this, getString(TrackPlayerR.string.rntp_temporary_channel_id))
                .setPriority(PRIORITY_LOW)
                .setCategory(Notification.CATEGORY_SERVICE)
                .setSmallIcon(ExoPlayerR.drawable.exo_notification_small_icon)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                notificationBuilder.foregroundServiceBehavior = NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE
            }
            val notification = notificationBuilder.build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(EMPTY_NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } else {
                startForeground(EMPTY_NOTIFICATION_ID, notification)
            }
            @Suppress("DEPRECATION")
            stopForeground(true)
        } catch (e: Exception) {
            // On Android 15+, startForeground() may throw ForegroundServiceStartNotAllowedException
            // when the app is in the background. Silently handle to prevent crash.
            android.util.Log.w("MusicService", "startForeground failed (likely background restriction on Android 15+): \${e.message}")
        }
    }`;

    if (content.includes('private fun startAndStopEmptyNotificationToAvoidANR()')) {
      content = content.replace(originalPattern, fixedMethod);
      // If exact match didn't work (whitespace differences), try a more flexible approach
      if (!content.includes('startForeground failed (likely background restriction')) {
        console.log('[withTrackPlayerNewArchFix] Exact pattern match failed for MusicService, trying flexible fix...');
        // Find the method and wrap its body in try-catch using line-by-line processing
        const lines = content.split('\n');
        const result = [];
        let inMethod = false;
        let methodBraceDepth = 0;
        let methodStartLine = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.includes('private fun startAndStopEmptyNotificationToAvoidANR()')) {
            inMethod = true;
            methodBraceDepth = 0;
            methodStartLine = i;
            // Add function signature
            result.push(line);
            continue;
          }
          
          if (inMethod) {
            for (const char of line) {
              if (char === '{') {
                if (methodBraceDepth === 0) {
                  // First opening brace - add try after it
                  methodBraceDepth++;
                  result.push(line);
                  result.push('        try {');
                  continue;
                }
                methodBraceDepth++;
              }
              if (char === '}') methodBraceDepth--;
            }
            
            if (methodBraceDepth === 0 && methodStartLine !== i) {
              // Closing brace of method
              // Add catch and closing braces
              result.push('        } catch (e: Exception) {');
              result.push('            android.util.Log.w("MusicService", "startForeground failed: ${e.message}")');
              result.push('        }');
              result.push(line); // The original closing }
              inMethod = false;
              continue;
            }
            
            // Replace bare startForeground with version-checked one
            if (line.includes('startForeground(EMPTY_NOTIFICATION_ID, notification)') && !line.includes('//')) {
              result.push('            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {');
              result.push('                startForeground(EMPTY_NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)');
              result.push('            } else {');
              result.push('                startForeground(EMPTY_NOTIFICATION_ID, notification)');
              result.push('            }');
              continue;
            }
          }
          
          result.push(line);
        }
        
        content = result.join('\n');
      }
    }
  }

  // Fix 2: Add null check for originalItem in getTrack and getActiveTrack
  // (This is from the existing patch)
  if (content.includes('Arguments.fromBundle(musicService.tracks[index].originalItem)')) {
    content = content.replace(
      'callback.resolve(Arguments.fromBundle(musicService.tracks[index].originalItem))',
      `val bundle = musicService.tracks[index].originalItem
            if (bundle != null) {
                callback.resolve(Arguments.fromBundle(bundle))
            } else {
                callback.resolve(null)
            }`
    );
    console.log('[withTrackPlayerNewArchFix] Fixed getTrack originalItem null check');
  }

  // Add marker
  content = '// FOREGROUND_SERVICE_FIX_APPLIED\n' + content;

  fs.writeFileSync(filePath, content);
  console.log('[withTrackPlayerNewArchFix] Fixed MusicService.kt foreground service crash');
}

module.exports = function withTrackPlayerNewArchFix(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;

    console.log('[withTrackPlayerNewArchFix] Applying TrackPlayer native fixes...');
    fixMusicModuleTurboModule(projectRoot);
    fixMusicServiceForeground(projectRoot);

    return config;
  }]);
};
