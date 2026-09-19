import UIKit
import Expo
import React
import FirebaseCrashlytics

// Keep the module-qualified Objective-C name used by the scene manifest.
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.frame = windowScene.coordinateSpace.bounds
        self.window = window
        MegaRadioSceneCoordinator.shared.attachPhone(to: window, options: connectionOptions)
        scheduleRenderWatchdog(window)
    }

    func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
        guard let app = UIApplication.shared.delegate as? AppDelegate else { return }
        for context in contexts {
            var options: [UIApplication.OpenURLOptionsKey: Any] = [
                .openInPlace: context.options.openInPlace
            ]
            options[.sourceApplication] = context.options.sourceApplication
            options[.annotation] = context.options.annotation
            _ = app.application(UIApplication.shared, open: context.url, options: options)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        MegaRadioSceneCoordinator.shared.forwardActivity(userActivity)
    }

    func windowScene(_ windowScene: UIWindowScene,
                     performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        guard let app = UIApplication.shared.delegate as? AppDelegate else {
            completionHandler(false)
            return
        }
        // Expo forwards to expo-quick-actions; do not just acknowledge the action.
        app.application(UIApplication.shared, performActionFor: shortcutItem,
                        completionHandler: completionHandler)
    }

    private func scheduleRenderWatchdog(_ window: UIWindow) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak window] in
            guard let window = window, !window.isHidden,
                  window.windowScene?.activationState == .foregroundActive else { return }
            let bounds = window.rootViewController?.view.bounds ?? .zero
            // Don't assume a particular RCT subview class exists (Fabric differs).
            guard bounds.width < 1 || bounds.height < 1 else { return }
            let error = NSError(domain: "MegaRadio.RenderWatchdog", code: 1,
                                userInfo: [NSLocalizedDescriptionKey: "Phone root has zero bounds after 5s"])
            Crashlytics.crashlytics().record(error: error)
        }
    }
}