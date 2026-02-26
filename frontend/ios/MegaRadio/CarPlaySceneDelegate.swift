// CarPlaySceneDelegate.swift
// CarPlay scene delegate for MegaRadio - Uses @g4rb4g3/react-native-carplay

import UIKit
import CarPlay

#if canImport(RNCarPlay)
import RNCarPlay
#endif

@available(iOS 14.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    var interfaceController: CPInterfaceController?
    var carWindow: CPWindow?
    
    // MARK: - CPTemplateApplicationSceneDelegate
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlay] Connected to CarPlay")
        self.interfaceController = interfaceController
        self.carWindow = window
        
        // Connect to RNCarPlay bridge
        #if canImport(RNCarPlay)
        RNCarPlay.connect(with: interfaceController, window: window)
        #endif
        
        // Notify React Native
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidConnect"), object: nil)
    }
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController,
        from window: CPWindow
    ) {
        print("[CarPlay] Disconnected from CarPlay")
        
        // Disconnect from RNCarPlay bridge
        #if canImport(RNCarPlay)
        RNCarPlay.disconnect()
        #endif
        
        self.interfaceController = nil
        self.carWindow = nil
        
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidDisconnect"), object: nil)
    }
}
