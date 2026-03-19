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
        
        // CRITICAL FIX: Do NOT call factory.startReactNative() here!
        // The React Native bridge was already initialized in AppDelegate.didFinishLaunchingWithOptions.
        // Calling it again causes: "recreateRootViewWithBundleURL does not support when react instance is created"
        // Instead, transfer the existing root view controller to this scene's window.
        if appDelegate?.isReactNativeReady() == true,
           let existingRootVC = appDelegate?.window?.rootViewController {
            print("[PhoneSceneDelegate] Reusing existing React Native root view controller")
            window.rootViewController = existingRootVC
        } else {
            // Fallback: If RN somehow wasn't initialized yet, do it now (shouldn't happen normally)
            print("[PhoneSceneDelegate] WARNING: React Native not yet initialized, starting now...")
            appDelegate?.initAppFromScene(connectionOptions: connectionOptions)
            if let rootVC = appDelegate?.window?.rootViewController {
                window.rootViewController = rootVC
            }
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
