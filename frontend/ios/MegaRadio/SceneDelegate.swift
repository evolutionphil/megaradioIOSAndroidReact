// SceneDelegate.swift
// Main app scene delegate for MegaRadio

import UIKit
import Expo
import React

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    
    var window: UIWindow?
    
    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        // Get the app delegate to access React Native factory
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
              let factory = appDelegate.reactNativeFactory else {
            print("[SceneDelegate] Error: Could not get React Native factory")
            return
        }
        
        // Create window for this scene
        let window = UIWindow(windowScene: windowScene)
        self.window = window
        
        // Start React Native in this window
        factory.startReactNative(
            withModuleName: "main",
            in: window,
            launchOptions: nil
        )
        
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
        for context in URLContexts {
            RCTLinkingManager.application(
                UIApplication.shared,
                open: context.url,
                options: [:]
            )
        }
    }
    
    // Handle Universal Links
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        RCTLinkingManager.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }
}
