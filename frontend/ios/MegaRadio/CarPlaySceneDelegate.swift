@preconcurrency import CarPlay

/// CarPlaySceneDelegate handles the CarPlay interface lifecycle.
/// This delegate is called when the app connects/disconnects from CarPlay.
@objc(CarPlaySceneDelegate)
@MainActor
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    var interfaceController: CPInterfaceController?
    
    /// Called when CarPlay connects to the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay connected")
        self.interfaceController = interfaceController
        
        // Set a loading template immediately to avoid blank screen
        // React Native will replace this with the actual content
        let loadingItem = CPListItem(text: "MegaRadio", detailText: "Yükleniyor...")
        let loadingSection = CPListSection(items: [loadingItem])
        let loadingTemplate = CPListTemplate(title: "MegaRadio", sections: [loadingSection])
        interfaceController.setRootTemplate(loadingTemplate, animated: false, completion: nil)
        
        // Connect to React Native CarPlay module
        RNCarPlay.connect(with: interfaceController, window: templateApplicationScene.carWindow)
    }
    
    /// Called when CarPlay disconnects from the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay disconnected")
        self.interfaceController = nil
        RNCarPlay.disconnect()
    }
    
    /// Called when CarPlay scene is about to connect (iOS 14+)
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlaySceneDelegate] CarPlay connected with window")
        self.interfaceController = interfaceController
        
        // Set a loading template immediately to avoid blank screen
        let loadingItem = CPListItem(text: "MegaRadio", detailText: "Yükleniyor...")
        let loadingSection = CPListSection(items: [loadingItem])
        let loadingTemplate = CPListTemplate(title: "MegaRadio", sections: [loadingSection])
        interfaceController.setRootTemplate(loadingTemplate, animated: false, completion: nil)
        
        // Connect to React Native CarPlay module
        RNCarPlay.connect(with: interfaceController, window: window)
    }
}
