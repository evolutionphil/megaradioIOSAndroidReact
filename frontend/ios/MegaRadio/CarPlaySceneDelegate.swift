@preconcurrency import CarPlay

/// CarPlaySceneDelegate handles the CarPlay interface lifecycle.
/// This delegate is called when the app connects/disconnects from CarPlay.
/// NOTE: RNCarPlay module calls are wrapped in safety checks to prevent crashes
/// when the native module is not properly linked.
@objc(CarPlaySceneDelegate)
@MainActor
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    var interfaceController: CPInterfaceController?
    
    /// Safely get RNCarPlay class - returns nil if not linked
    private func getRNCarPlayClass() -> AnyClass? {
        return NSClassFromString("RNCarPlay")
    }
    
    /// Safely connect to RNCarPlay module
    private func safeConnectToRNCarPlay(interfaceController: CPInterfaceController, window: CPWindow?) {
        guard let rnCarPlayClass = getRNCarPlayClass() else {
            print("[CarPlaySceneDelegate] RNCarPlay module not available - using native-only mode")
            return
        }
        
        // Use performSelector to safely call the method
        let selector = NSSelectorFromString("connectWithInterfaceController:window:")
        if rnCarPlayClass.responds(to: selector) {
            _ = (rnCarPlayClass as AnyObject).perform(selector, with: interfaceController, with: window)
            print("[CarPlaySceneDelegate] Successfully connected to RNCarPlay")
        } else {
            print("[CarPlaySceneDelegate] RNCarPlay.connect method not found")
        }
    }
    
    /// Safely disconnect from RNCarPlay module
    private func safeDisconnectFromRNCarPlay() {
        guard let rnCarPlayClass = getRNCarPlayClass() else {
            print("[CarPlaySceneDelegate] RNCarPlay module not available - skipping disconnect")
            return
        }
        
        let selector = NSSelectorFromString("disconnect")
        if rnCarPlayClass.responds(to: selector) {
            _ = (rnCarPlayClass as AnyObject).perform(selector)
            print("[CarPlaySceneDelegate] Successfully disconnected from RNCarPlay")
        }
    }
    
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
        
        // Safely connect to React Native CarPlay module
        safeConnectToRNCarPlay(interfaceController: interfaceController, window: templateApplicationScene.carWindow)
    }
    
    /// Called when CarPlay disconnects from the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay disconnected")
        self.interfaceController = nil
        safeDisconnectFromRNCarPlay()
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
        
        // Safely connect to React Native CarPlay module
        safeConnectToRNCarPlay(interfaceController: interfaceController, window: window)
    }
}
