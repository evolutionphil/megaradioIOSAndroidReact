import UIKit
import Expo
import React

/// PhoneSceneDelegate handles the main app window lifecycle.
/// Required when UIApplicationSceneManifest is present in Info.plist.
@objc(PhoneSceneDelegate)
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    nonisolated func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        // Get the root view from ExpoAppDelegate
        let appDelegate = UIApplication.shared.delegate as? AppDelegate
        
        // Create window for this scene
        let window = UIWindow(windowScene: windowScene)
        
        // Use the existing React Native factory to create the root view
        if let factory = appDelegate?.reactNativeFactory {
            factory.startReactNative(
                withModuleName: "main",
                in: window,
                launchOptions: nil
            )
        }
        
        window.makeKeyAndVisible()
        self.window = window
        appDelegate?.window = window
    }

    nonisolated func sceneDidDisconnect(_ scene: UIScene) {
        // Called when the scene is being released by the system.
    }

    nonisolated func sceneDidBecomeActive(_ scene: UIScene) {
        // Called when the scene has moved from an inactive state to an active state.
    }

    nonisolated func sceneWillResignActive(_ scene: UIScene) {
        // Called when the scene will move from an active state to an inactive state.
    }

    nonisolated func sceneWillEnterForeground(_ scene: UIScene) {
        // Called as the scene transitions from the background to the foreground.
    }

    nonisolated func sceneDidEnterBackground(_ scene: UIScene) {
        // Called as the scene transitions from the foreground to the background.
    }
}
