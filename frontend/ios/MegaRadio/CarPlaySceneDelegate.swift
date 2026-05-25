import CarPlay
import Foundation
import UIKit

/// Scene delegate for CarPlay sessions.
///
/// Referenced from Info.plist under:
///   UIApplicationSceneManifest →
///     UISceneConfigurations →
///       CPTemplateApplicationSceneSessionRoleApplication → [{
///         UISceneClassName = "CPTemplateApplicationScene",
///         UISceneDelegateClassName = "$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate",
///         UISceneConfigurationName = "MegaRadio-CarPlay",
///       }]
///
/// IMPORTANT NOTES on why this works:
///
/// 1) DO NOT add `@objc(CarPlaySceneDelegate)` — using the renamed Obj-C
///    class name breaks `NSClassFromString("MegaRadio.CarPlaySceneDelegate")`
///    that iOS uses to resolve the value in UISceneDelegateClassName. With
///    the rename, iOS can't find the class, silently falls back to a default
///    UIResponder, and then crashes at runtime with:
///       "Application does not implement CarPlay template application
///        lifecycle methods in its scene delegate."
///    Plain `@objc` (without arg) keeps the auto-generated module-prefixed
///    Obj-C name ("MegaRadio.CarPlaySceneDelegate") which exactly matches
///    the Info.plist value of `$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate`.
///
/// 2) We implement BOTH the modern 2-arg signatures (iOS 13.0+, no window
///    arg) AND the deprecated 3-arg signatures (with window). iOS may call
///    either depending on version & connection path. CarPlay's runtime
///    check for "does the delegate respond to ANY lifecycle selector?" is
///    satisfied as soon as one matches.
@objc public class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

    // MARK: - Modern signatures (iOS 13.0+)

    public func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        // iOS 13+ doesn't pass the window separately — grab it off the scene.
        let window = templateApplicationScene.carWindow
        RNCarPlay.connect(with: interfaceController, window: window)
    }

    public func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnectInterfaceController interfaceController: CPInterfaceController
    ) {
        RNCarPlay.disconnect()
    }

    // MARK: - Deprecated signatures (iOS 12, still called in some paths)

    public func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        RNCarPlay.connect(with: interfaceController, window: window)
    }

    public func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController,
        from window: CPWindow
    ) {
        RNCarPlay.disconnect()
    }
}
