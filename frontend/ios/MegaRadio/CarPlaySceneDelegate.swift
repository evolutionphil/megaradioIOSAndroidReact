// CarPlaySceneDelegate.swift
// CarPlay scene delegate for MegaRadio

import UIKit
import CarPlay

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
        
        // Set root template - Now Playing for audio apps
        let nowPlayingTemplate = CPNowPlayingTemplate.shared
        interfaceController.setRootTemplate(nowPlayingTemplate, animated: true) { success, error in
            if let error = error {
                print("[CarPlay] Error setting root template: \(error)")
            } else {
                print("[CarPlay] Root template set successfully")
            }
        }
        
        // Post notification for React Native to handle
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidConnect"), object: nil)
    }
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController,
        from window: CPWindow
    ) {
        print("[CarPlay] Disconnected from CarPlay")
        self.interfaceController = nil
        self.carWindow = nil
        
        // Post notification for React Native to handle
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidDisconnect"), object: nil)
    }
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didSelect navigationAlert: CPNavigationAlert
    ) {
        // Handle navigation alerts if needed
        print("[CarPlay] Navigation alert selected")
    }
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didSelect maneuver: CPManeuver
    ) {
        // Handle maneuvers if needed
        print("[CarPlay] Maneuver selected")
    }
}
