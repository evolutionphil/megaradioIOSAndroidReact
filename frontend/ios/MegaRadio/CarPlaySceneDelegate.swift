@preconcurrency import CarPlay

/// CarPlaySceneDelegate handles the CarPlay interface lifecycle.
/// This delegate is called when the app connects/disconnects from CarPlay.
@objc(CarPlaySceneDelegate)
@MainActor
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    /// Called when CarPlay connects to the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay connected")
        RNCarPlay.connect(with: interfaceController, window: templateApplicationScene.carWindow)
    }
    
    /// Called when CarPlay disconnects from the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay disconnected")
        RNCarPlay.disconnect()
    }
    
    /// Called when CarPlay scene is about to connect (iOS 14+)
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlaySceneDelegate] CarPlay connected with window")
        RNCarPlay.connect(with: interfaceController, window: window)
    }
}
