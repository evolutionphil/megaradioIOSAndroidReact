import UIKit
import Expo
import React

/// PhoneSceneDelegate handles the main app window lifecycle.
/// Required when UIApplicationSceneManifest is present in Info.plist.
/// IMPORTANT: React Native bridge is initialized ONCE in AppDelegate.
/// This delegate only transfers the existing root view to the scene window.
@objc(PhoneSceneDelegate)
@MainActor
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        let appDelegate = UIApplication.shared.delegate as? AppDelegate
        
        // Create window for this scene (must use windowScene for iOS 13+ scene lifecycle)
        let window = UIWindow(windowScene: windowScene)
        
        // CRITICAL FIX: Do NOT call factory.startReactNative() if RN is already running.
        // But if RN is NOT yet initialized (normal phone launch), start it here with the scene window.
        if appDelegate?.isReactNativeReady() == true,
           let existingRootVC = appDelegate?.window?.rootViewController {
            // CarPlay cold-start scenario: RN was started by CarPlay before phone scene connected.
            // Transfer the existing root view controller to this scene's window.
            print("[PhoneSceneDelegate] Reusing existing React Native root view controller")
            window.rootViewController = existingRootVC
        } else {
            // Normal launch: Phone scene is first. Start React Native with this scene's window.
            print("[PhoneSceneDelegate] Starting React Native with scene window...")
            if let factory = appDelegate?.reactNativeFactory {
                factory.startReactNative(
                    withModuleName: "main",
                    in: window,
                    launchOptions: nil
                )
            }
            appDelegate?.markReactNativeInitialized()
            print("[PhoneSceneDelegate] React Native started successfully")
        }
        
        window.makeKeyAndVisible()
        self.window = window
        appDelegate?.window = window
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // Called when the scene is being released by the system.
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Called when the scene has moved from an inactive state to an active state.
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Called when the scene will move from an active state to an inactive state.
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Called as the scene transitions from the background to the foreground.
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Called as the scene transitions from the foreground to the background.
    }
}
