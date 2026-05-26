import UIKit
import Expo
import React

/// PhoneSceneDelegate handles the main app window lifecycle.
/// Required when UIApplicationSceneManifest is present in Info.plist.
@objc(PhoneSceneDelegate)
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        NSLog("🟦 [PhoneSceneDelegate] scene(_:willConnectTo:options:) CALLED")
        NSLog("🟦 [PhoneSceneDelegate] scene class: \(type(of: scene)), role: \(session.role.rawValue)")

        guard let windowScene = scene as? UIWindowScene else {
            NSLog("🔴 [PhoneSceneDelegate] FATAL: scene is NOT a UIWindowScene — got \(type(of: scene))")
            return
        }
        NSLog("🟦 [PhoneSceneDelegate] windowScene OK")

        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            NSLog("🔴 [PhoneSceneDelegate] FATAL: UIApplication.shared.delegate is NOT AppDelegate (got \(String(describing: UIApplication.shared.delegate)))")
            return
        }
        NSLog("🟦 [PhoneSceneDelegate] appDelegate OK")

        guard let factory = appDelegate.reactNativeFactory else {
            NSLog("🔴 [PhoneSceneDelegate] FATAL: appDelegate.reactNativeFactory is nil — RN factory wasn't created in didFinishLaunchingWithOptions")
            return
        }
        NSLog("🟦 [PhoneSceneDelegate] factory OK: \(factory)")

        let window = UIWindow(windowScene: windowScene)
        NSLog("🟦 [PhoneSceneDelegate] UIWindow created: bounds=\(window.bounds), windowScene=\(String(describing: window.windowScene))")

        NSLog("🟦 [PhoneSceneDelegate] Calling factory.startReactNative(...)...")
        factory.startReactNative(
            withModuleName: "main",
            in: window,
            launchOptions: nil
        )
        NSLog("🟦 [PhoneSceneDelegate] factory.startReactNative returned. rootViewController=\(String(describing: window.rootViewController))")

        window.makeKeyAndVisible()
        NSLog("🟦 [PhoneSceneDelegate] makeKeyAndVisible called. isKeyWindow=\(window.isKeyWindow), isHidden=\(window.isHidden), alpha=\(window.alpha)")

        self.window = window
        appDelegate.window = window
        appDelegate.markReactNativeInitialized()

        NSLog("🟩 [PhoneSceneDelegate] DONE — phone scene fully connected")
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        NSLog("🟦 [PhoneSceneDelegate] sceneDidDisconnect")
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        NSLog("🟦 [PhoneSceneDelegate] sceneDidBecomeActive. window.isKeyWindow=\(self.window?.isKeyWindow ?? false), rootVC=\(String(describing: self.window?.rootViewController))")
    }

    func sceneWillResignActive(_ scene: UIScene) {
        NSLog("🟦 [PhoneSceneDelegate] sceneWillResignActive")
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        NSLog("🟦 [PhoneSceneDelegate] sceneWillEnterForeground")
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        NSLog("🟦 [PhoneSceneDelegate] sceneDidEnterBackground")
    }
}
