import CarPlay

/// CarPlaySceneDelegate handles the CarPlay interface lifecycle.
/// This delegate is called when the app connects/disconnects from CarPlay.
@objc(CarPlaySceneDelegate)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    /// Called when CarPlay connects to the app
    nonisolated func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay connected")
        
        // Dispatch to main thread for React Native bridge calls
        DispatchQueue.main.async {
            // Objective-C: + (void) connectWithInterfaceController:window:
            // Swift translation: connect(withInterfaceController:window:)
            RNCarPlay.connect(withInterfaceController: interfaceController, window: templateApplicationScene.carWindow)
        }
    }
    
    /// Called when CarPlay disconnects from the app  
    nonisolated func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay disconnected")
        
        DispatchQueue.main.async {
            RNCarPlay.disconnect()
        }
    }
    
    /// Called when CarPlay scene is about to connect (iOS 14+)
    nonisolated func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlaySceneDelegate] CarPlay connected with window")
        
        DispatchQueue.main.async {
            RNCarPlay.connect(withInterfaceController: interfaceController, window: window)
        }
    }
}
