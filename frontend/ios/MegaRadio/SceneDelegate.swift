// SceneDelegate.swift
// Main app scene delegate for MegaRadio - Expo SDK 55 compatible

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    
    var window: UIWindow?
    
    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        // Get the app delegate
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            print("[SceneDelegate] Error: Could not get AppDelegate")
            return
        }
        
        // Create window for this scene
        let window = UIWindow(windowScene: windowScene)
        self.window = window
        appDelegate.window = window
        
        // Let AppDelegate handle React Native initialization
        if let factory = appDelegate.reactNativeFactory {
            factory.startReactNative(
                withModuleName: "main",
                in: window,
                launchOptions: nil
            )
        }
        
        window.makeKeyAndVisible()
        
        print("[SceneDelegate] Main app scene connected")
    }
    
    func sceneDidDisconnect(_ scene: UIScene) {
        print("[SceneDelegate] Main app scene disconnected")
    }
    
    func sceneDidBecomeActive(_ scene: UIScene) {
        // App became active
    }
    
    func sceneWillResignActive(_ scene: UIScene) {
        // App will become inactive
    }
    
    func sceneWillEnterForeground(_ scene: UIScene) {
        // App entering foreground
    }
    
    func sceneDidEnterBackground(_ scene: UIScene) {
        // App entered background
    }
    
    // Handle URL opening
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        for context in URLContexts {
            appDelegate.application(UIApplication.shared, open: context.url, options: [:])
        }
    }
    
    // Handle Universal Links
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
