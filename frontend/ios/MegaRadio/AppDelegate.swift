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
  // Captured launchOptions so the UIScene lifecycle (MainSceneDelegate)
  // can pass them through to React Native when it finally creates the
  // window. AppDelegate fires earlier than `scene(_:willConnectTo:)`,
  // and we don't have the windowScene at that point.
  var launchOptionsForScene: [UIApplication.LaunchOptionsKey: Any]?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
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

    // Stash launchOptions for MainSceneDelegate. We can't mount React
    // Native here anymore — the iPhone scene doesn't exist yet, and any
    // UIWindow we create now will be invisible because it has no
    // `windowScene`. MainSceneDelegate.scene(_:willConnectTo:options:)
    // will pick this up and start React Native on the correct window.
    self.launchOptionsForScene = launchOptions

#if os(iOS) || os(tvOS)
// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-10e8520570672fd76b2403b7e1e27f5198a6349a
FirebaseApp.configure()
// @generated end @react-native-firebase/app-didFinishLaunchingWithOptions
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
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
  // as if the user had tapped a deep link. This works in both the regular
  // iOS UI and CarPlay (CarPlay session forwards continueUserActivity to
  // the same AppDelegate method).
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if let mediaUrl = SiriPlayMediaHandler.deepLinkURL(for: userActivity) {
      // Defer to the very next runloop so the JS bundle has a chance to
      // mount its Linking listener before the URL fires.
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

// MARK: - CarPlay Scene Configuration
//
// DO NOT add `application(_:configurationForConnecting:options:)` here.
//
// Implementing that method forces iOS to adopt the UIScene lifecycle for
// EVERY connecting scene — including the iPhone window. Because we have
// no UIWindowSceneSessionRoleApplication scene delegate declared, iPhone
// then gets a scene with no window delegate, AppDelegate.window is
// IGNORED, and the React Native root view never makes it on-screen →
// the app shows only the splash, then a permanent black screen.
//
// Instead, CarPlay scene configuration is handled entirely by Info.plist's
// UIApplicationSceneManifest → CPTemplateApplicationSceneSessionRoleApplication
// entry, which points at CarPlaySceneDelegate. With no scene config
// declared (and no method overriding it) for the iPhone role, iOS falls
// back to the legacy UIApplicationDelegate lifecycle we set up above in
// application(_:didFinishLaunchingWithOptions:) — and the AppDelegate
// window gets shown normally.
