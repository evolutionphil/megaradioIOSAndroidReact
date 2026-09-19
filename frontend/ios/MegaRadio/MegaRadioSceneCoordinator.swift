import UIKit
import React
import Expo
import CarPlay

/// One factory, bridge and mounted React tree for phone AND CarPlay-first launches.
/// No dummy UIWindow and no second AudioProvider when the phone later opens.
final class MegaRadioSceneCoordinator {
    static let shared = MegaRadioSceneCoordinator()
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    private var rootView: UIView?
    private var started = false

    private var app: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }

    func startForCarPlay() {
        dispatchPrecondition(condition: .onQueue(.main))
        guard !started, let factory = app?.reactNativeFactory else { return }
        started = true
        // Creating a root runs AppRegistry (initializing only the host would not
        // mount CarPlayHandler). Retain it until the real phone scene attaches.
        let root = factory.rootViewFactory.view(withModuleName: "main",
                                               initialProperties: nil,
                                               launchOptions: launchOptions)
        root.frame = UIScreen.main.bounds
        root.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        rootView = root
    }

    func attachPhone(to window: UIWindow, options: UIScene.ConnectionOptions) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard let app = app, let factory = app.reactNativeFactory else { return }
        let wasStarted = started
        let urls = connectionURLs(options)
        if !wasStarted, let url = urls.first { launchOptions[.url] = url }
        app.window = window
        if let root = rootView {
            // Use the same React tree, not another startReactNative()/AudioProvider.
            let controller = UIViewController()
            root.removeFromSuperview()
            root.frame = window.bounds
            controller.view = root
            window.rootViewController = controller
        } else {
            started = true
            factory.startReactNative(withModuleName: "main", in: window,
                                     launchOptions: launchOptions)
            rootView = window.rootViewController?.view
        }
        window.makeKeyAndVisible()
        window.rootViewController?.view.setNeedsLayout()
        window.rootViewController?.view.layoutIfNeeded()
        // Cold URLs come from RCTLinkingManager.getInitialURL, never emit twice.
        if wasStarted { urls.forEach(forwardURL) }
    }

    private func connectionURLs(_ options: UIScene.ConnectionOptions) -> [URL] {
        if let item = options.shortcutItem, item.type == "play-last",
           let url = URL(string: "megaradio://?playLast=1&source=quick_action") {
            return [url]
        }
        return options.urlContexts.map(\.url) + options.userActivities.compactMap {
            SiriPlayMediaHandler.deepLinkURL(for: $0) ?? $0.webpageURL
        }
    }

    func forwardURL(_ url: URL) {
        guard let app = app else { return }
        _ = app.application(UIApplication.shared, open: url, options: [:])
    }

    func forwardActivity(_ activity: NSUserActivity) {
        if let url = SiriPlayMediaHandler.deepLinkURL(for: activity) {
            forwardURL(url)
        } else if let app = app {
            _ = app.application(UIApplication.shared, continue: activity,
                                restorationHandler: { _ in })
        }
    }
}

extension AppDelegate {
    public func application(_ application: UIApplication,
                            configurationForConnecting session: UISceneSession,
                            options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let car = session.role == .carTemplateApplication
        let config = UISceneConfiguration(name: car ? "CarPlay" : "Default Configuration",
                                          sessionRole: session.role)
        if car {
            config.delegateClass = CarPlaySceneDelegate.self
            config.sceneClass = CPTemplateApplicationScene.self
        } else {
            config.delegateClass = PhoneSceneDelegate.self
        }
        return config
    }
}