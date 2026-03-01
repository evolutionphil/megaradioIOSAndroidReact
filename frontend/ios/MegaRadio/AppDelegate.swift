import Expo
// Google Cast DISABLED - causes Fabric crash on RN 0.81.5
// @generated begin react-native-google-cast-import - expo prebuild (DO NOT MODIFY) sync-4cd300bca26a1d1fcc83f4baf37b0e62afcc1867
// #if canImport(GoogleCast) && os(iOS)
// import GoogleCast
// #endif
// @generated end react-native-google-cast-import
import React
import ReactAppDependencyProvider
import CarPlay

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  
  // Flag to track if React Native has been initialized
  private var isReactNativeInitialized = false

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
// @generated begin react-native-google-cast-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-878430aae4b1b32ad54e4b64ed01ca473a2a80a6
// Google Cast DISABLED - causes Fabric crash on RN 0.81.5
// This code block is intentionally commented out
/*
#if canImport(GoogleCast) && os(iOS)
    let receiverAppID = kGCKDefaultMediaReceiverApplicationID
    let criteria = GCKDiscoveryCriteria(applicationID: receiverAppID)
    let options = GCKCastOptions(discoveryCriteria: criteria)
    GCKCastContext.setSharedInstanceWith(options)
#endif
*/
// @generated end react-native-google-cast-didFinishLaunchingWithOptions
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

    // CRITICAL FOR COLD-START: Initialize React Native bridge IMMEDIATELY
    // This ensures JS runtime is available when CarPlay connects first (app was killed)
    // Without this, CarPlay shows "Loading" indefinitely
    #if os(iOS) || os(tvOS)
    print("[AppDelegate] Initializing React Native bridge for cold-start support...")
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
    isReactNativeInitialized = true
    print("[AppDelegate] React Native bridge initialized successfully")
    #endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // MARK: - React Native Bridge Initialization for Scene Lifecycle
  
  /// Initialize React Native bridge from any scene (Phone or CarPlay)
  /// This ensures the JS runtime is available even when CarPlay connects first
  @objc public func initAppFromScene(connectionOptions: UIScene.ConnectionOptions?) {
    guard !isReactNativeInitialized else {
      print("[AppDelegate] React Native already initialized, skipping")
      return
    }
    
    print("[AppDelegate] Initializing React Native from scene...")
    
    guard let factory = reactNativeFactory else {
      print("[AppDelegate] ERROR: reactNativeFactory is nil")
      return
    }
    
    // Create a temporary window for React Native initialization
    // This is needed because React Native needs a window to start
    if window == nil {
      window = UIWindow(frame: UIScreen.main.bounds)
    }
    
    // Start React Native with the module name
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: nil
    )
    
    isReactNativeInitialized = true
    print("[AppDelegate] React Native initialized successfully from scene")
  }
  
  /// Check if React Native is initialized
  @objc public func isReactNativeReady() -> Bool {
    return isReactNativeInitialized
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
