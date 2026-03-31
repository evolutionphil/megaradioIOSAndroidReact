// Expo Config Plugin: Fix CarPlayModule.kt carContext uninitialized crash
//
// Problem: CarPlayModule.kt uses `lateinit var carContext: CarContext`
// On Android, carContext is only initialized when Android Auto connects.
// Methods like createScreen, createTemplate, setRootTemplate etc. crash
// with UninitializedPropertyAccessException when called before Android Auto connection.
//
// Fix: Add `isCarContextReady()` guard to ALL methods that access carContext.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function fixCarPlayModule(projectRoot) {
  const filePath = path.join(
    projectRoot,
    'node_modules/@g4rb4g3/react-native-carplay/android/src/main/java/org/birkir/carplay/CarPlayModule.kt'
  );

  if (!fs.existsSync(filePath)) {
    console.log('[withCarPlayFix] CarPlayModule.kt not found, skipping');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already fixed
  if (content.includes('// CARPLAY_CONTEXT_FIX_APPLIED')) {
    console.log('[withCarPlayFix] CarPlayModule.kt already fixed');
    return;
  }

  // Add isCarContextReady() helper if not present
  if (!content.includes('isCarContextReady')) {
    // Add right after the class declaration body starts (after companion object or in the class body)
    // Find `didConnect` method as anchor point
    const anchor = 'eventEmitter.didConnect()';
    if (content.includes(anchor)) {
      content = content.replace(
        anchor + '\n  }',
        anchor + '\n  }\n\n  private fun isCarContextReady(): Boolean {\n    return ::carContext.isInitialized\n  }'
      );
      console.log('[withCarPlayFix] Added isCarContextReady() helper');
    }
  }

  // Guard createTemplate method
  if (!content.includes('createTemplate: carContext not initialized')) {
    content = content.replace(
      /handler\.post\s*\{\s*\n(\s*)Log\.d\(TAG,\s*"Creating template \$templateId"\)/,
      `handler.post {\n$1if (!isCarContextReady()) {\n$1  Log.w(TAG, "createTemplate: carContext not initialized yet, skipping template '\$templateId'")\n$1  val args = com.facebook.react.bridge.Arguments.createMap()\n$1  args.putString("error", "carContext not initialized")\n$1  callback?.invoke(args)\n$1  return@post\n$1}\n$1Log.d(TAG, "Creating template \$templateId")`
    );
    console.log('[withCarPlayFix] Guarded createTemplate');
  }

  // Guard updateTemplate method
  if (!content.includes('updateTemplate: carContext not initialized')) {
    content = content.replace(
      /fun updateTemplate\(templateId: String, config: ReadableMap\)\s*\{\s*\n(\s*)handler\.post\s*\{/,
      `fun updateTemplate(templateId: String, config: ReadableMap) {\n$1handler.post {\n$1  if (!isCarContextReady()) {\n$1    Log.w(TAG, "updateTemplate: carContext not initialized yet, skipping template '\$templateId'")\n$1    return@post\n$1  }`
    );
    console.log('[withCarPlayFix] Guarded updateTemplate');
  }

  // Guard setRootTemplate method
  if (!content.includes('setRootTemplate: carContext not initialized')) {
    content = content.replace(
      /fun setRootTemplate\(templateId: String, animated: Boolean\?\)\s*\{\s*\n(\s*)Log\.d\(TAG,\s*"set Root Template for \$templateId"\)\s*\n(\s*)handler\.post\s*\{/,
      `fun setRootTemplate(templateId: String, animated: Boolean?) {\n$1Log.d(TAG, "set Root Template for \$templateId")\n$2handler.post {\n$2  if (!isCarContextReady()) {\n$2    Log.w(TAG, "setRootTemplate: carContext not initialized yet, skipping")\n$2    return@post\n$2  }`
    );
    console.log('[withCarPlayFix] Guarded setRootTemplate');
  }

  // Guard pushTemplate method
  if (!content.includes('pushTemplate: carContext not initialized')) {
    content = content.replace(
      /fun pushTemplate\(templateId: String, animated: Boolean\?\)\s*\{\s*\n(\s*)handler\.post\s*\{/,
      `fun pushTemplate(templateId: String, animated: Boolean?) {\n$1handler.post {\n$1  if (!isCarContextReady()) {\n$1    Log.w(TAG, "pushTemplate: carContext not initialized yet, skipping template '\$templateId'")\n$1    return@post\n$1  }`
    );
    console.log('[withCarPlayFix] Guarded pushTemplate');
  }

  // Guard toast method (directly accesses carContext)
  if (!content.includes('toast: carContext not initialized')) {
    content = content.replace(
      /fun toast\(text: String, isLongDurationToast: Boolean\)\s*\{/,
      `fun toast(text: String, isLongDurationToast: Boolean) {\n    if (!isCarContextReady()) {\n      Log.w(TAG, "toast: carContext not initialized yet, skipping")\n      return\n    }`
    );
    console.log('[withCarPlayFix] Guarded toast');
  }

  // Guard alert method
  if (!content.includes('alert: carContext not initialized')) {
    content = content.replace(
      /fun alert\(props: ReadableMap\)\s*\{\s*\n(\s*)handler\.post\s*\{/,
      `fun alert(props: ReadableMap) {\n$1handler.post {\n$1  if (!isCarContextReady()) {\n$1    Log.w(TAG, "alert: carContext not initialized yet, skipping")\n$1    return@post\n$1  }`
    );
    console.log('[withCarPlayFix] Guarded alert');
  }

  // Guard dismissAlert method
  if (!content.includes('dismissAlert: carContext not initialized')) {
    content = content.replace(
      /fun dismissAlert\(alertId: Int\)\s*\{/,
      `fun dismissAlert(alertId: Int) {\n    if (!isCarContextReady()) {\n      Log.w(TAG, "dismissAlert: carContext not initialized yet, skipping")\n      return\n    }`
    );
    console.log('[withCarPlayFix] Guarded dismissAlert');
  }

  // Guard getHostInfo method
  if (!content.includes('getHostInfo: carContext not initialized')) {
    content = content.replace(
      /fun getHostInfo\(promise: Promise\)\s*\{/,
      `fun getHostInfo(promise: Promise) {\n    if (!isCarContextReady()) {\n      Log.w(TAG, "getHostInfo: carContext not initialized yet")\n      promise.resolve(com.facebook.react.bridge.Arguments.createMap())\n      return\n    }`
    );
    console.log('[withCarPlayFix] Guarded getHostInfo');
  }

  // Guard startTelemetryObserver method
  if (!content.includes('startTelemetryObserver: carContext not initialized')) {
    content = content.replace(
      /fun startTelemetryObserver\(promise: Promise\)\s*\{/,
      `fun startTelemetryObserver(promise: Promise) {\n    if (!isCarContextReady()) {\n      Log.w(TAG, "startTelemetryObserver: carContext not initialized yet")\n      promise.reject("E_NOT_READY", "carContext not initialized yet")\n      return\n    }`
    );
    console.log('[withCarPlayFix] Guarded startTelemetryObserver');
  }

  // Guard requestPermissions method
  if (!content.includes('requestPermissions: carContext not initialized')) {
    content = content.replace(
      /fun requestPermissions\(permissions: ReadableArray, message: String, primaryAction: ReadableMap, headerAction: ReadableMap, promise: Promise\)\s*\{/,
      `fun requestPermissions(permissions: ReadableArray, message: String, primaryAction: ReadableMap, headerAction: ReadableMap, promise: Promise) {\n    if (!isCarContextReady()) {\n      Log.w(TAG, "requestPermissions: carContext not initialized yet")\n      promise.reject("E_NOT_READY", "carContext not initialized yet")\n      return\n    }`
    );
    console.log('[withCarPlayFix] Guarded requestPermissions');
  }

  // Guard getPlayServicesAvailable method
  if (!content.includes('getPlayServicesAvailable: carContext not initialized')) {
    content = content.replace(
      /fun getPlayServicesAvailable\(promise: Promise\)\s*\{/,
      `fun getPlayServicesAvailable(promise: Promise) {\n    if (!isCarContextReady()) {\n      Log.w(TAG, "getPlayServicesAvailable: carContext not initialized yet")\n      promise.resolve(false)\n      return\n    }`
    );
    console.log('[withCarPlayFix] Guarded getPlayServicesAvailable');
  }

  // Guard createScreen method (CRITICAL - the method that crashes at line 469)
  if (!content.includes('createScreen: carContext not initialized')) {
    // Handle both patched and unpatched signatures
    const patterns = [
      /private fun createScreen\(templateId: String, templateConfig: ReadableMap\?\): CarScreen\?\s*\{/,
      /private fun createScreen\(id: String, config: ReadableMap\)\s*\{/,
    ];
    
    let replaced = false;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          return match + '\n    if (!isCarContextReady()) {\n      Log.w(TAG, "createScreen: carContext not initialized yet, skipping")\n      return null\n    }';
        });
        console.log('[withCarPlayFix] Guarded createScreen (CRITICAL)');
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      console.log('[withCarPlayFix] WARNING: Could not find createScreen method to guard');
    }
  }

  // Add marker
  content = '// CARPLAY_CONTEXT_FIX_APPLIED\n' + content;

  fs.writeFileSync(filePath, content);
  console.log('[withCarPlayFix] CarPlayModule.kt fixes applied');
}

function fixCarPlaySession(projectRoot) {
  const filePath = path.join(
    projectRoot,
    'node_modules/@g4rb4g3/react-native-carplay/android/src/main/java/org/birkir/carplay/CarPlaySession.kt'
  );

  if (!fs.existsSync(filePath)) {
    console.log('[withCarPlayFix] CarPlaySession.kt not found, skipping');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix ReactRootViewTagGenerator import (TurboModule compatibility)
  if (content.includes('import com.facebook.react.uimanager.ReactRootViewTagGenerator')) {
    content = content.replace(
      'import com.facebook.react.uimanager.ReactRootViewTagGenerator',
      'import java.util.concurrent.atomic.AtomicInteger'
    );

    // Replace usage
    content = content.replace(
      'ReactRootViewTagGenerator.getNextRootViewTag()',
      'getNextRootViewTag()'
    );

    // Add companion method if not present
    if (!content.includes('fun getNextRootViewTag()')) {
      content = content.replace(
        'const val TAG = "CarPlaySession"',
        'const val TAG = "CarPlaySession"\n    private val sNextRootViewTag = AtomicInteger(11)\n    fun getNextRootViewTag(): Int = sNextRootViewTag.addAndGet(10)'
      );
    }

    console.log('[withCarPlayFix] Fixed CarPlaySession ReactRootViewTagGenerator');
  }

  fs.writeFileSync(filePath, content);
}

function fixCarPlayParser(projectRoot) {
  const parserPath = path.join(
    projectRoot,
    'node_modules/@g4rb4g3/react-native-carplay/android/src/main/java/org/birkir/carplay/parser/Parser.kt'
  );

  if (!fs.existsSync(parserPath)) return;

  let content = fs.readFileSync(parserPath, 'utf-8');

  // Fix null-safety issues
  if (content.includes('cueMap.getInt("alignment")') && !content.includes('cueMap?.getInt("alignment")')) {
    content = content.replace(/cueMap\.getString\("text"\)/g, 'cueMap?.getString("text")');
    content = content.replace(/cueMap\.getMap\("image"\)!/g, 'cueMap?.getMap("image")!');
    content = content.replace(/cueMap\.getInt\("alignment"\)/g, 'cueMap?.getInt("alignment") ?: 0');
    content = content.replace(/cueMap\.getInt\("start"\)/g, 'cueMap?.getInt("start") ?: 0');
    content = content.replace(/cueMap\.getInt\("end"\)/g, 'cueMap?.getInt("end") ?: 0');
    console.log('[withCarPlayFix] Fixed Parser.kt null-safety');
  }

  fs.writeFileSync(parserPath, content);

  // Fix RCTTemplate.kt null-safety
  const rctTemplatePath = path.join(
    projectRoot,
    'node_modules/@g4rb4g3/react-native-carplay/android/src/main/java/org/birkir/carplay/parser/RCTTemplate.kt'
  );

  if (fs.existsSync(rctTemplatePath)) {
    let rctContent = fs.readFileSync(rctTemplatePath, 'utf-8');

    if (rctContent.includes('setText(titleVariants.getString(1))') && !rctContent.includes('setText(titleVariants.getString(1) ?: "")')) {
      rctContent = rctContent.replace(
        'setText(titleVariants.getString(1))',
        'setText(titleVariants.getString(1) ?: "")'
      );
      console.log('[withCarPlayFix] Fixed RCTTemplate.kt setText null-safety');
    }

    if (rctContent.includes('builder.addText(it.getString(i))') && !rctContent.includes('builder.addText(it.getString(i) ?: "")')) {
      rctContent = rctContent.replace(
        'builder.addText(it.getString(i))',
        'builder.addText(it.getString(i) ?: "")'
      );
      console.log('[withCarPlayFix] Fixed RCTTemplate.kt addText null-safety');
    }

    fs.writeFileSync(rctTemplatePath, rctContent);
  }
}

module.exports = function withCarPlayFix(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.projectRoot;

    console.log('[withCarPlayFix] Applying CarPlay/Android Auto native fixes...');
    fixCarPlayModule(projectRoot);
    fixCarPlaySession(projectRoot);
    fixCarPlayParser(projectRoot);

    return config;
  }]);
};
