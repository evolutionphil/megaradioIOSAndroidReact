import CarPlay
import Foundation
import UIKit

/// Scene delegate for CarPlay sessions.
///
/// iOS expects this class to be referenced in Info.plist under:
///   UIApplicationSceneManifest →
///     UISceneConfigurations →
///       CPTemplateApplicationSceneSessionRoleApplication → [{
///         UISceneClassName = "CPTemplateApplicationScene",
///         UISceneDelegateClassName = "$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate",
///         UISceneConfigurationName = "MegaRadio-CarPlay",
///       }]
///
/// Without this delegate the app crashes at launch with:
///   "Application does not implement CarPlay template application lifecycle
///    methods in its scene delegate."
///
/// The two required lifecycle methods simply forward to the @g4rb4g3/react-
/// native-carplay bridge, which JS uses to mount its CarPlay UI.
@objc(CarPlaySceneDelegate)
public class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

    public func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        // Forward to the React Native CarPlay module so JS can present
        // its templates (ListTemplate, NowPlayingTemplate, etc.).
        RNCarPlay.connect(with: interfaceController, window: window)
    }

    public func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnectInterfaceController interfaceController: CPInterfaceController
    ) {
        RNCarPlay.disconnect()
    }

    public func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController,
        from window: CPWindow
    ) {
        RNCarPlay.disconnect()
    }
}
