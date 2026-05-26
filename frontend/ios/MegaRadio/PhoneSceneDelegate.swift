import UIKit
import Expo
import React

/// PhoneSceneDelegate handles the main iPhone window lifecycle.
///
/// IMPORTANT: We start React Native HERE — not in AppDelegate. iOS gives
/// us a UIWindowScene only at scene connection time, and RCTRootView's
/// layout cycle requires a windowScene-attached window to compute its
/// frame correctly. Starting RN in AppDelegate (on a windowScene=nil
/// window) and then transferring the rootViewController over here
/// produces a permanent `RCTRootContentView frame=(0,0,0,0)` and a
/// black screen (Apple deprecated that pattern in iOS 13+, the runtime
/// warns: "Manually adding the rootViewController's view to the view
/// hierarchy is no longer supported").
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

        guard let factory = appDelegate.reactNativeFactory else {
            NSLog("🔴 [PhoneSceneDelegate] FATAL: reactNativeFactory is nil")
            return
        }

        // Create the window FIRST (windowScene-attached so layout works).
        let window = UIWindow(windowScene: windowScene)
        NSLog("🟦 [PhoneSceneDelegate] UIWindow created. bounds=\(window.bounds), windowScene set ✅")

        // Start RN here. ExpoReactNativeFactory will install RCTRootView
        // as the rootViewController.view of this window. Layout works
        // because windowScene is attached BEFORE RN measures.
        NSLog("🟦 [PhoneSceneDelegate] Calling factory.startReactNative on scene window…")
        factory.startReactNative(
            withModuleName: "main",
            in: window,
            launchOptions: nil
        )
        appDelegate.markReactNativeInitialized()
        NSLog("🟦 [PhoneSceneDelegate] factory.startReactNative returned.")
        NSLog("🟦 [PhoneSceneDelegate]   rootVC=\(String(describing: window.rootViewController))")
        NSLog("🟦 [PhoneSceneDelegate]   rootVC.view=\(String(describing: window.rootViewController?.view))")
        NSLog("🟦 [PhoneSceneDelegate]   rootVC.view.frame=\(String(describing: window.rootViewController?.view.frame))")
        NSLog("🟦 [PhoneSceneDelegate]   rootVC.view.subviews.count=\(window.rootViewController?.view.subviews.count ?? -1)")

        window.makeKeyAndVisible()
        NSLog("🟦 [PhoneSceneDelegate] makeKeyAndVisible. isKeyWindow=\(window.isKeyWindow), isHidden=\(window.isHidden)")

        self.window = window
        appDelegate.window = window

        // 1-second delayed inspection so we can see actual layout state.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let win = self?.window else { return }
            NSLog("🟡 [PhoneSceneDelegate +1s] rootVC.view.frame=\(String(describing: win.rootViewController?.view.frame))")
            NSLog("🟡 [PhoneSceneDelegate +1s] rootVC.view.subviews.count=\(win.rootViewController?.view.subviews.count ?? -1)")
            if let subviews = win.rootViewController?.view.subviews {
                for (i, sv) in subviews.enumerated() {
                    NSLog("🟡 [PhoneSceneDelegate +1s]   subview[\(i)] = \(type(of: sv)) frame=\(sv.frame) hidden=\(sv.isHidden) alpha=\(sv.alpha)")
                }
            }
        }

        NSLog("🟩 [PhoneSceneDelegate] DONE")
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        NSLog("🟦 [PhoneSceneDelegate] sceneDidBecomeActive")
    }

    func sceneDidDisconnect(_ scene: UIScene) { }
    func sceneWillResignActive(_ scene: UIScene) { }
    func sceneWillEnterForeground(_ scene: UIScene) { }
    func sceneDidEnterBackground(_ scene: UIScene) { }
}
