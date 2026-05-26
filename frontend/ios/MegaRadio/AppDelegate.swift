import Expo
import FirebaseCore
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

  // Flag used by PhoneSceneDelegate to know if the RN bridge has already
  // been started (e.g. by CarPlay connecting first in a cold-launch).
  // It lets the phone scene reuse the existing rootViewController instead
  // of double-mounting the bundle.
  private var isReactNativeInitialized = false

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    NSLog("🟪 [AppDelegate] didFinishLaunchingWithOptions BEGIN")
// @generated begin react-native-google-cast-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-b83f3fabf49797475a3f26a5bfeb5cfd51fa39c4
#if canImport(GoogleCast) && os(iOS)
    let receiverAppID = kGCKDefaultMediaReceiverApplicationID
    let criteria = GCKDiscoveryCriteria(applicationID: receiverAppID)
    let options = GCKCastOptions(discoveryCriteria: criteria)
    options.disableDiscoveryAutostart = false
    options.startDiscoveryAfterFirstTapOnCastButton = true
    options.suspendSessionsWhenBackgrounded = true
    GCKCastContext.setSharedInstanceWith(options)
    GCKCastContext.sharedInstance().useDefaultExpandedMediaControls = true
#endif
// @generated end react-native-google-cast-didFinishLaunchingWithOptions
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)
    NSLog("🟪 [AppDelegate] factory bound: \(factory)")

#if os(iOS) || os(tvOS)
// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-10e8520570672fd76b2403b7e1e27f5198a6349a
FirebaseApp.configure()
// @generated end @react-native-firebase/app-didFinishLaunchingWithOptions

    // ──────────────────────────────────────────────────────────────────
    // CRITICAL: Start React Native HERE on a legacy UIWindow.
    //
    // Why not in PhoneSceneDelegate? Because ExpoAppDelegate (our parent)
    // does not actually invoke the UIScene lifecycle by default — it
    // continues to use the legacy UIApplicationDelegate pipeline even
    // when Info.plist declares a UIApplicationSceneManifest. As a result
    // `application(_:configurationForConnecting:)` is NEVER called and
    // PhoneSceneDelegate.scene(_:willConnectTo:) NEVER fires. JS still
    // loads (Firebase analytics events fire), but there's no window
    // attached to a UIWindowScene, so nothing renders → black screen.
    //
    // Starting RN here on `UIScreen.main.bounds` reproduces the
    // pre-CarPlay behaviour that has always worked. If iOS DOES decide
    // to spin up scenes later (e.g. CarPlay connecting), PhoneSceneDelegate
    // detects isReactNativeReady() == true and reuses the root view
    // controller in the new windowScene — no double-mount.
    // ──────────────────────────────────────────────────────────────────
    NSLog("🟪 [AppDelegate] Creating legacy UIWindow and starting React Native…")
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
    isReactNativeInitialized = true
    NSLog("🟪 [AppDelegate] startReactNative returned. window.rootViewController=\(String(describing: window?.rootViewController)), isHidden=\(window?.isHidden ?? true), isKeyWindow=\(window?.isKeyWindow ?? false)")
#endif

    NSLog("🟪 [AppDelegate] didFinishLaunchingWithOptions END")
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // MARK: - Scene Configuration (iOS 13+)
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    NSLog("🟪 [AppDelegate] configurationForConnecting role=\(connectingSceneSession.role.rawValue)")
    if connectingSceneSession.role == UISceneSession.Role.carTemplateApplication {
      NSLog("🟪 [AppDelegate] → returning CarPlaySceneDelegate config")
      let config = UISceneConfiguration(
        name: "CarPlay",
        sessionRole: connectingSceneSession.role
      )
      config.delegateClass = CarPlaySceneDelegate.self
      config.sceneClass = CPTemplateApplicationScene.self
      return config
    }

    NSLog("🟪 [AppDelegate] → returning PhoneSceneDelegate config")
    let config = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
    config.delegateClass = PhoneSceneDelegate.self
    return config
  }

  // MARK: - React Native bridge ready-state helpers
  //
  // PhoneSceneDelegate calls these to coordinate with CarPlay so we
  // never double-initialise the JS runtime.

  @objc public func isReactNativeReady() -> Bool {
    return isReactNativeInitialized
  }

  @objc public func markReactNativeInitialized() {
    isReactNativeInitialized = true
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links + Siri voice intents (INPlayMediaIntent for CarPlay /
  // "Hey Siri, play Rock Antenne on MegaRadio"). When iOS resolves a Siri
  // media intent it hands us a userActivity of type `INPlayMediaIntent` (or
  // `com.visiongo.megaradio.playMedia`). We unwrap the station name and
  // synthesize a `megaradio://play?q=<name>` deep link — the React Native
  // Linking handler (already wired up) opens the search/play flow exactly
  // as if the user had tapped a deep link.
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if let mediaUrl = SiriPlayMediaHandler.deepLinkURL(for: userActivity) {
      DispatchQueue.main.async {
        _ = RCTLinkingManager.application(application, open: mediaUrl, options: [:])
      }
      return true
    }
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
