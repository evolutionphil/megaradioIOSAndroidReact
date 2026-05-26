import UIKit
import React

/// Scene delegate for the regular iPhone (UIWindowScene) lifecycle.
///
/// WHY THIS FILE EXISTS:
///
/// Once we declare `UIApplicationSceneManifest` in Info.plist (which is
/// REQUIRED for CarPlay), iOS adopts the UIScene lifecycle for the entire
/// app — including the iPhone window. The legacy `AppDelegate.window`
/// that `factory.startReactNative(in: window, ...)` writes to is then
/// IGNORED by UIKit because there is no `windowScene` attached to it,
/// and the result is a permanent black screen after the splash.
///
/// The fix is to:
///   1) Declare a `UIWindowSceneSessionRoleApplication` config in
///      Info.plist pointing at this class.
///   2) Create the UIWindow here, attached to the scene's UIWindowScene.
///   3) Mount the React Native root view into that window.
///
/// AppDelegate still does all the heavy lifting (Firebase, Google Cast,
/// creating the ExpoReactNativeFactory). The factory is held on
/// AppDelegate so we can pull it out here and ask it to mount RN once
/// our scene window exists.
@objc public class MainSceneDelegate: UIResponder, UIWindowSceneDelegate {

    public var window: UIWindow?

    public func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        guard let factory = appDelegate.reactNativeFactory else { return }

        let window = UIWindow(windowScene: windowScene)
        self.window = window
        // Keep AppDelegate.window in sync — some libraries (deep linking,
        // notifications, etc.) reach for `UIApplication.shared.delegate.window`.
        appDelegate.window = window

        factory.startReactNative(
            withModuleName: "main",
            in: window,
            launchOptions: appDelegate.launchOptionsForScene
        )

        // factory.startReactNative is supposed to call makeKeyAndVisible,
        // but we call it again defensively so we never end up with a
        // hidden window if a future factory version changes that.
        window.makeKeyAndVisible()
    }

    // Forward deep links (`megaradio://...`, universal links, Siri INPlayMediaIntent)
    // that arrive while a UIScene is active. These can't be handled by
    // AppDelegate's `application(_:open:options:)` when the app is in
    // scene-based mode, so we forward them to RCTLinkingManager directly.

    public func scene(
        _ scene: UIScene,
        openURLContexts URLContexts: Set<UIOpenURLContext>
    ) {
        for context in URLContexts {
            _ = RCTLinkingManager.application(
                UIApplication.shared,
                open: context.url,
                options: [:]
            )
        }
    }

    public func scene(
        _ scene: UIScene,
        continue userActivity: NSUserActivity
    ) {
        // Siri voice intents → synthesize megaradio:// deep link.
        if let mediaUrl = SiriPlayMediaHandler.deepLinkURL(for: userActivity) {
            DispatchQueue.main.async {
                _ = RCTLinkingManager.application(
                    UIApplication.shared,
                    open: mediaUrl,
                    options: [:]
                )
            }
            return
        }
        // Universal links and other NSUserActivity types.
        _ = RCTLinkingManager.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}
