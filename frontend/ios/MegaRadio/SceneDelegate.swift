// SceneDelegate.swift
// Main app scene delegate for MegaRadio - Works with Expo SDK 55

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    
    var window: UIWindow?
    
    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        // Get AppDelegate
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            print("[SceneDelegate] Error: Could not get AppDelegate")
            return
        }
        
        // Create window
        let window = UIWindow(windowScene: windowScene)
        self.window = window
        appDelegate.window = window
        
        // Start React Native using Expo factory
        if let factory = appDelegate.reactNativeFactory {
            factory.startReactNative(
                withModuleName: "main",
                in: window,
                launchOptions: nil
            )
        }
        
        window.makeKeyAndVisible()
        print("[SceneDelegate] Main app scene connected successfully")
    }
    
    func sceneDidDisconnect(_ scene: UIScene) {
        print("[SceneDelegate] Main app scene disconnected")
    }
    
    func sceneDidBecomeActive(_ scene: UIScene) {}
    func sceneWillResignActive(_ scene: UIScene) {}
    func sceneWillEnterForeground(_ scene: UIScene) {}
    func sceneDidEnterBackground(_ scene: UIScene) {}
    
    // Handle URL
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
        }
    }
}
