import UIKit
import Expo
import React

/// PhoneSceneDelegate handles the main app window lifecycle WHEN iOS
/// decides to invoke the UIScene lifecycle. ExpoAppDelegate often stays
/// in legacy mode and never spins up this delegate — in which case the
/// AppDelegate-created window is already on-screen and we never get
/// called. That's fine.
///
/// When this delegate IS invoked (e.g. iPad multitasking, CarPlay paired
/// scenes, or future iOS behaviour changes), we transfer the existing
/// React Native root view controller into the scene's window instead of
/// double-mounting the JS bundle.
@objc(PhoneSceneDelegate)
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        NSLog("🟦 [PhoneSceneDelegate] scene(_:willConnectTo:options:) CALLED, role=\(session.role.rawValue)")

        guard let windowScene = scene as? UIWindowScene else {
            NSLog("🔴 [PhoneSceneDelegate] FATAL: scene is NOT a UIWindowScene")
            return
        }

        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            NSLog("🔴 [PhoneSceneDelegate] FATAL: delegate is not AppDelegate")
            return
        }

        let window = UIWindow(windowScene: windowScene)

        if appDelegate.isReactNativeReady(),
           let existingRootVC = appDelegate.window?.rootViewController {
            // RN was already started by AppDelegate — transfer the
            // existing root view controller to this scene's window.
            NSLog("🟦 [PhoneSceneDelegate] Reusing existing root view controller from AppDelegate")
            window.rootViewController = existingRootVC
        } else if let factory = appDelegate.reactNativeFactory {
            // Defensive fallback: start RN now if AppDelegate didn't.
            NSLog("🟦 [PhoneSceneDelegate] Starting RN with scene window (fallback)…")
            factory.startReactNative(
                withModuleName: "main",
                in: window,
                launchOptions: nil
            )
            appDelegate.markReactNativeInitialized()
        }

        window.makeKeyAndVisible()
        self.window = window
        appDelegate.window = window
        NSLog("🟩 [PhoneSceneDelegate] DONE — phone scene fully connected. isKeyWindow=\(window.isKeyWindow), isHidden=\(window.isHidden)")
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        NSLog("🟦 [PhoneSceneDelegate] sceneDidBecomeActive")
    }

    func sceneDidDisconnect(_ scene: UIScene) { }
    func sceneWillResignActive(_ scene: UIScene) { }
    func sceneWillEnterForeground(_ scene: UIScene) { }
    func sceneDidEnterBackground(_ scene: UIScene) { }
}
