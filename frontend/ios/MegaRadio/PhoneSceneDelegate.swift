import UIKit
import Expo
import React
import FirebaseCrashlytics

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

        // ──────────────────────────────────────────────────────────────
        // BLACK-SCREEN REGRESSION WATCHDOG
        //
        // Schedule a check 5 seconds after scene connection. If
        // RCTRootContentView is still zero-sized at that point, the
        // splash → black screen bug has regressed (likely cause: scene
        // lifecycle wiring is broken because expo prebuild --clean
        // wiped this file or AppDelegate.swift). We:
        //
        //   1) Log diagnostics to NSLog so the next build session sees it
        //      in Xcode console immediately.
        //   2) Record a non-fatal Crashlytics error so TestFlight beta
        //      testers AND production users surface the bug in our
        //      dashboard — not silently hang on a black screen.
        //
        // This is far more valuable than an XCTest UI snapshot suite
        // because it runs on every real device, not just CI.
        // ──────────────────────────────────────────────────────────────
        scheduleBlackScreenWatchdog(window: window)
    }

    private func scheduleBlackScreenWatchdog(window: UIWindow) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak window] in
            guard let win = window else { return }
            guard let rootView = win.rootViewController?.view else {
                PhoneSceneDelegate.reportRenderFailure(reason: "rootViewController.view is nil after 5s", window: win)
                return
            }
            // RCTRootContentView is the actual RN-managed subview. If
            // either it or rootView has zero size, RN never rendered.
            let zeroRoot = rootView.frame.width < 1 || rootView.frame.height < 1
            let rctContent = rootView.subviews.first(where: { String(describing: type(of: $0)).contains("RCTRoot") })
            let zeroContent = rctContent.map { $0.frame.width < 1 || $0.frame.height < 1 } ?? true
            let noSubviews = rootView.subviews.isEmpty

            if zeroRoot || zeroContent || noSubviews {
                let reason = "Black-screen regression: zeroRoot=\(zeroRoot) zeroContent=\(zeroContent) noSubviews=\(noSubviews) rootFrame=\(rootView.frame) rctFrame=\(String(describing: rctContent?.frame))"
                PhoneSceneDelegate.reportRenderFailure(reason: reason, window: win)
            } else {
                NSLog("[RenderWatchdog] OK — rootFrame=\(rootView.frame), subviews=\(rootView.subviews.count)")
            }
        }
    }

    private static func reportRenderFailure(reason: String, window: UIWindow) {
        NSLog("🔴🔴🔴 [RenderWatchdog] FAIL: \(reason)")
        NSLog("🔴 [RenderWatchdog] window=\(window), windowScene=\(String(describing: window.windowScene)), isKey=\(window.isKeyWindow), isHidden=\(window.isHidden)")

        // Surface to Crashlytics as a non-fatal so it lights up in the
        // dashboard for every TestFlight / App Store user that hits it.
        let userInfo: [String: Any] = [
            "reason": reason,
            "windowScene_isSet": window.windowScene != nil,
            "window_isKeyWindow": window.isKeyWindow,
            "window_isHidden": window.isHidden,
            "rootVC_class": String(describing: type(of: window.rootViewController as Any)),
        ]
        let err = NSError(
            domain: "MegaRadio.RenderWatchdog",
            code: 1,
            userInfo: userInfo
        )
        Crashlytics.crashlytics().record(error: err)
        Crashlytics.crashlytics().setCustomValue(reason, forKey: "last_render_failure_reason")
    }

    func sceneDidDisconnect(_ scene: UIScene) { }
    func sceneDidBecomeActive(_ scene: UIScene) { }
    func sceneWillResignActive(_ scene: UIScene) { }
    func sceneWillEnterForeground(_ scene: UIScene) { }
    func sceneDidEnterBackground(_ scene: UIScene) { }
}
