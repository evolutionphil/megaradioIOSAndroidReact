@preconcurrency import CarPlay
import UIKit

/// CarPlaySceneDelegate handles the CarPlay interface lifecycle.
/// This delegate is called when the app connects/disconnects from CarPlay.
/// NOTE: RNCarPlay module calls are wrapped in safety checks to prevent crashes
/// when the native module is not properly linked.
@objc(CarPlaySceneDelegate)
@MainActor
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    var interfaceController: CPInterfaceController?
    
    // Remote logging helper
    private func sendRemoteLog(level: String, message: String, data: [String: Any]? = nil) {
        let apiUrl = "https://themegaradio.com/api/logs/remote"
        let apiKey = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"
        
        // Get app version info
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
        
        var logEntry: [String: Any] = [
            "level": level,
            "message": message,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        if let data = data {
            logEntry["data"] = data
        }
        
        let payload: [String: Any] = [
            "deviceId": "ios_carplay_\(deviceId.prefix(8))",
            "platform": "ios",
            "appVersion": appVersion,
            "buildNumber": buildNumber,
            "isCarPlayLog": true,
            "logs": [logEntry]
        ]
        
        guard let url = URL(string: apiUrl),
              let jsonData = try? JSONSerialization.data(withJSONObject: payload) else {
            print("[CarPlayLog] Failed to create request")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.httpBody = jsonData
        
        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error = error {
                print("[CarPlayLog] Send failed: \(error.localizedDescription)")
            } else if let httpResponse = response as? HTTPURLResponse {
                print("[CarPlayLog] Sent (\(httpResponse.statusCode)): \(message)")
            }
        }.resume()
    }
    
    /// Safely get RNCarPlay class - returns nil if not linked
    private func getRNCarPlayClass() -> AnyClass? {
        let rnClass = NSClassFromString("RNCarPlay")
        sendRemoteLog(level: "debug", message: "RNCarPlay class lookup", data: [
            "found": rnClass != nil
        ])
        return rnClass
    }
    
    /// Safely connect to RNCarPlay module
    private func safeConnectToRNCarPlay(interfaceController: CPInterfaceController, window: CPWindow?) {
        sendRemoteLog(level: "info", message: "Attempting RNCarPlay connection")
        
        guard let rnCarPlayClass = getRNCarPlayClass() else {
            sendRemoteLog(level: "warn", message: "RNCarPlay module not available - using native-only mode")
            print("[CarPlaySceneDelegate] RNCarPlay module not available - using native-only mode")
            return
        }
        
        // Use performSelector to safely call the method
        let selector = NSSelectorFromString("connectWithInterfaceController:window:")
        if rnCarPlayClass.responds(to: selector) {
            _ = (rnCarPlayClass as AnyObject).perform(selector, with: interfaceController, with: window)
            sendRemoteLog(level: "info", message: "RNCarPlay.connect called successfully")
            print("[CarPlaySceneDelegate] Successfully connected to RNCarPlay")
        } else {
            sendRemoteLog(level: "error", message: "RNCarPlay.connect method not found", data: [
                "selector": "connectWithInterfaceController:window:"
            ])
            print("[CarPlaySceneDelegate] RNCarPlay.connect method not found")
        }
    }
    
    /// Safely disconnect from RNCarPlay module
    private func safeDisconnectFromRNCarPlay() {
        guard let rnCarPlayClass = getRNCarPlayClass() else {
            sendRemoteLog(level: "debug", message: "RNCarPlay not available - skipping disconnect")
            print("[CarPlaySceneDelegate] RNCarPlay module not available - skipping disconnect")
            return
        }
        
        let selector = NSSelectorFromString("disconnect")
        if rnCarPlayClass.responds(to: selector) {
            _ = (rnCarPlayClass as AnyObject).perform(selector)
            sendRemoteLog(level: "info", message: "RNCarPlay disconnected")
            print("[CarPlaySceneDelegate] Successfully disconnected from RNCarPlay")
        }
    }
    
    /// Called when CarPlay connects to the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay connected")
        sendRemoteLog(level: "info", message: "CarPlay CONNECTED (didConnect)", data: [
            "hasWindow": false,
            "method": "templateApplicationScene:didConnect:"
        ])
        
        self.interfaceController = interfaceController
        
        // Set a loading template immediately to avoid blank screen
        // React Native will replace this with the actual content
        let loadingItem = CPListItem(text: "MegaRadio", detailText: "Yükleniyor...")
        let loadingSection = CPListSection(items: [loadingItem])
        let loadingTemplate = CPListTemplate(title: "MegaRadio", sections: [loadingSection])
        
        interfaceController.setRootTemplate(loadingTemplate, animated: false) { success, error in
            if success {
                self.sendRemoteLog(level: "info", message: "Loading template SET", data: [
                    "title": "MegaRadio",
                    "detailText": "Yükleniyor..."
                ])
            } else {
                self.sendRemoteLog(level: "error", message: "Failed to set loading template", data: [
                    "error": error?.localizedDescription ?? "unknown"
                ])
            }
        }
        
        // Safely connect to React Native CarPlay module
        safeConnectToRNCarPlay(interfaceController: interfaceController, window: templateApplicationScene.carWindow)
    }
    
    /// Called when CarPlay disconnects from the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] CarPlay disconnected")
        sendRemoteLog(level: "info", message: "CarPlay DISCONNECTED")
        
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
        sendRemoteLog(level: "info", message: "CarPlay CONNECTED with window (iOS 14+)", data: [
            "hasWindow": true,
            "windowBounds": "\(window.bounds)",
            "method": "templateApplicationScene:didConnect:to:"
        ])
        
        self.interfaceController = interfaceController
        
        // Set a loading template immediately to avoid blank screen
        let loadingItem = CPListItem(text: "MegaRadio", detailText: "Yükleniyor...")
        let loadingSection = CPListSection(items: [loadingItem])
        let loadingTemplate = CPListTemplate(title: "MegaRadio", sections: [loadingSection])
        
        interfaceController.setRootTemplate(loadingTemplate, animated: false) { success, error in
            if success {
                self.sendRemoteLog(level: "info", message: "Loading template SET (with window)", data: [
                    "title": "MegaRadio",
                    "detailText": "Yükleniyor..."
                ])
            } else {
                self.sendRemoteLog(level: "error", message: "Failed to set loading template (with window)", data: [
                    "error": error?.localizedDescription ?? "unknown"
                ])
            }
        }
        
        // Safely connect to React Native CarPlay module
        safeConnectToRNCarPlay(interfaceController: interfaceController, window: window)
    }
}
