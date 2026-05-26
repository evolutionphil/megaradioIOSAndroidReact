import UIKit
import Expo
import React

/// PhoneSceneDelegate handles the main iPhone window lifecycle.
///
/// IMPORTANT: React Native is started HERE — not in AppDelegate. iOS only
/// provides a UIWindowScene at scene connection time, and RCTRootView's
/// layout cycle requires a windowScene-attached UIWindow to compute its
/// frame correctly. Starting RN earlier (in AppDelegate, on a
/// windowScene=nil window) and transferring the rootViewController over
/// produces a permanent `RCTRootContentView frame=(0,0,0,0)` and a
/// black screen after splash. Apple deprecated that transfer pattern in
/// iOS 13+; the runtime warns:
///   "Manually adding the rootViewController's view to the view hierarchy
///    is no longer supported."
@objc(PhoneSceneDelegate)
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        guard let factory = appDelegate.reactNativeFactory else { return }

        let window = UIWindow(windowScene: windowScene)
        factory.startReactNative(
            withModuleName: "main",
            in: window,
            launchOptions: nil
        )
        appDelegate.markReactNativeInitialized()
        window.makeKeyAndVisible()

        self.window = window
        appDelegate.window = window
    }

    func sceneDidDisconnect(_ scene: UIScene) { }
    func sceneDidBecomeActive(_ scene: UIScene) { }
    func sceneWillResignActive(_ scene: UIScene) { }
    func sceneWillEnterForeground(_ scene: UIScene) { }
    func sceneDidEnterBackground(_ scene: UIScene) { }
}
