import Expo
// @generated begin react-native-google-cast-import - expo prebuild (DO NOT MODIFY) sync-4cd300bca26a1d1fcc83f4baf37b0e62afcc1867
#if canImport(GoogleCast) && os(iOS)
import GoogleCast
#endif
// @generated end react-native-google-cast-import
import React
import ReactAppDependencyProvider
import CarPlay

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
// @generated begin react-native-google-cast-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-878430aae4b1b32ad54e4b64ed01ca473a2a80a6
// DISABLED: Google Cast causes crash with React Native 0.81+ Fabric architecture
// Error: RCTThirdPartyComponentsProvider - attempt to insert nil object
// TODO: Re-enable when react-native-google-cast is updated for Fabric compatibility
/*
#if canImport(GoogleCast) && os(iOS)
    let receiverAppID = "94952E1F"
    let criteria = GCKDiscoveryCriteria(applicationID: receiverAppID)
    let options = GCKCastOptions(discoveryCriteria: criteria)
    options.disableDiscoveryAutostart = false
    options.startDiscoveryAfterFirstTapOnCastButton = true
    options.suspendSessionsWhenBackgrounded = true
    GCKCastContext.setSharedInstanceWith(options)
    GCKCastContext.sharedInstance().useDefaultExpandedMediaControls = true
#endif
*/
// @generated end react-native-google-cast-didFinishLaunchingWithOptions
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    // Note: Window creation is now handled by PhoneSceneDelegate for scene-based lifecycle
    // Only create window here if scene manifest is not configured (fallback for older iOS)
    #if os(iOS) || os(tvOS)
    if #available(iOS 13.0, *) {
      // Scene-based lifecycle - window will be created by PhoneSceneDelegate
    } else {
      // Legacy window-based lifecycle (iOS 12 and earlier)
      window = UIWindow(frame: UIScreen.main.bounds)
      factory.startReactNative(
        withModuleName: "main",
        in: window,
        launchOptions: launchOptions)
    }
    #endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // MARK: - Scene Configuration (iOS 13+)
  
  /// Returns the scene configuration for connecting scene sessions
  /// This is called when a new scene session is created (phone or CarPlay)
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    
    // Check if this is a CarPlay session
    if connectingSceneSession.role == .carTemplateApplication {
      print("[AppDelegate] Configuring CarPlay scene")
      let config = UISceneConfiguration(
        name: "CarPlay",
        sessionRole: connectingSceneSession.role
      )
      config.delegateClass = CarPlaySceneDelegate.self
      return config
    }
    
    // Default: Phone/iPad scene
    print("[AppDelegate] Configuring Phone scene")
    let config = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
    config.delegateClass = PhoneSceneDelegate.self
    return config
  }
  
  /// Called when a scene session is being discarded
  public func application(
    _ application: UIApplication,
    didDiscardSceneSessions sceneSessions: Set<UISceneSession>
  ) {
    // Called when the user discards a scene session.
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
