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
    private var connectionAttempts = 0
    private var templateSetAttempts = 0
    
    // MARK: - Remote Logging
    
    private func sendRemoteLog(level: String, message: String, data: [String: Any]? = nil) {
        let apiUrl = "https://themegaradio.com/api/logs/remote"
        let apiKey = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"
        
        // Get app version info
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
        
        var logEntry: [String: Any] = [
            "level": level,
            "message": "[SWIFT] \(message)",
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
    
    // MARK: - RNCarPlay Module Detection
    
    /// Check all possible RNCarPlay class names
    private func findRNCarPlayClass() -> AnyClass? {
        // Try different class name patterns
        let classNames = [
            "RNCarPlay",
            "react_native_carplay.RNCarPlay",
            "MegaRadio.RNCarPlay",
            "CarPlay.RNCarPlay",
        ]
        
        for className in classNames {
            if let cls = NSClassFromString(className) {
                sendRemoteLog(level: "info", message: "RNCarPlay class FOUND", data: [
                    "className": className,
                    "classDescription": String(describing: cls)
                ])
                return cls
            }
        }
        
        // Log that class was not found
        sendRemoteLog(level: "warn", message: "RNCarPlay class NOT FOUND", data: [
            "searchedClassNames": classNames,
            "hint": "Check if react-native-carplay pod is installed and linked"
        ])
        
        return nil
    }
    
    /// Safely get RNCarPlay class - returns nil if not linked
    private func getRNCarPlayClass() -> AnyClass? {
        return findRNCarPlayClass()
    }
    
    /// List all available selectors on RNCarPlay (simplified)
    private func listRNCarPlayMethods(_ cls: AnyClass) {
        // Just log that we found the class - detailed method listing removed for build compatibility
        sendRemoteLog(level: "debug", message: "RNCarPlay class found - checking methods", data: [
            "className": String(describing: cls)
        ])
    }
    
    // Pending connection info - for retry when bridge is ready
    private var pendingInterfaceController: CPInterfaceController?
    private var pendingWindow: CPWindow?
    private var retryTimer: Timer?
    private let maxRetryAttempts = 30  // Increase to 30 attempts
    private let retryInterval: TimeInterval = 0.5  // Faster retries (500ms)
    
    /// Check if React Native bridge is ready using RNCarPlay class availability
    private func isBridgeReady() -> Bool {
        // Simple check: if RNCarPlay class exists and responds to connect, bridge should be ready
        guard let rnCarPlayClass = NSClassFromString("RNCarPlay") else {
            return false
        }
        
        // Check if the connect method exists - this indicates the module is properly initialized
        let selector = NSSelectorFromString("connectWithInterfaceController:window:")
        let responds = (rnCarPlayClass as AnyObject).responds(to: selector)
        
        return responds
    }
    
    /// Safely connect to RNCarPlay module with detailed logging and retry logic
    private func safeConnectToRNCarPlay(interfaceController: CPInterfaceController, window: CPWindow?) {
        connectionAttempts += 1
        
        let bridgeReady = isBridgeReady()
        sendRemoteLog(level: "info", message: "Attempting RNCarPlay connection", data: [
            "attempt": connectionAttempts,
            "hasWindow": window != nil,
            "windowDescription": window != nil ? "\(window!.bounds)" : "nil",
            "bridgeReady": bridgeReady
        ])
        
        // If bridge is not ready, queue the connection for retry
        if !bridgeReady && connectionAttempts < maxRetryAttempts {
            sendRemoteLog(level: "warn", message: "Bridge NOT READY - queuing connection for retry", data: [
                "attempt": connectionAttempts,
                "maxRetries": maxRetryAttempts,
                "retryInterval": retryInterval
            ])
            
            pendingInterfaceController = interfaceController
            pendingWindow = window
            
            // Schedule retry
            DispatchQueue.main.async { [weak self] in
                self?.retryTimer?.invalidate()
                self?.retryTimer = Timer.scheduledTimer(withTimeInterval: self?.retryInterval ?? 1.0, repeats: false) { [weak self] _ in
                    guard let self = self,
                          let controller = self.pendingInterfaceController else { return }
                    self.safeConnectToRNCarPlay(interfaceController: controller, window: self.pendingWindow)
                }
            }
            return
        }
        
        guard let rnCarPlayClass = getRNCarPlayClass() else {
            sendRemoteLog(level: "error", message: "RNCarPlay module NOT AVAILABLE", data: [
                "consequence": "CarPlay will show loading screen only",
                "solution": "Check if react-native-carplay pod is installed correctly"
            ])
            print("[CarPlaySceneDelegate] RNCarPlay module not available - using native-only mode")
            return
        }
        
        // List available methods for debugging
        listRNCarPlayMethods(rnCarPlayClass)
        
        // Try different method signatures
        let methodSignatures = [
            "connectWithInterfaceController:window:",
            "connect:window:",
            "connectWithInterfaceController:",
            "connect:",
        ]
        
        for signature in methodSignatures {
            let selector = NSSelectorFromString(signature)
            
            sendRemoteLog(level: "debug", message: "Checking method signature", data: [
                "signature": signature,
                "selectorExists": rnCarPlayClass.responds(to: selector)
            ])
            
            if rnCarPlayClass.responds(to: selector) {
                sendRemoteLog(level: "info", message: "Calling RNCarPlay method", data: [
                    "method": signature,
                    "bridgeReady": bridgeReady
                ])
                
                do {
                    if signature.contains("window:") {
                        _ = (rnCarPlayClass as AnyObject).perform(selector, with: interfaceController, with: window)
                    } else {
                        _ = (rnCarPlayClass as AnyObject).perform(selector, with: interfaceController)
                    }
                    
                    sendRemoteLog(level: "info", message: "RNCarPlay.connect CALLED SUCCESSFULLY", data: [
                        "method": signature,
                        "bridgeReady": bridgeReady,
                        "nextStep": "React Native should now receive connection event and create templates"
                    ])
                    print("[CarPlaySceneDelegate] Successfully connected to RNCarPlay via \(signature)")
                    
                    // Clear pending connection
                    pendingInterfaceController = nil
                    pendingWindow = nil
                    retryTimer?.invalidate()
                    retryTimer = nil
                    
                    return
                } catch {
                    sendRemoteLog(level: "error", message: "RNCarPlay method call FAILED", data: [
                        "method": signature,
                        "error": "\(error)"
                    ])
                }
            }
        }
        
        sendRemoteLog(level: "error", message: "NO VALID RNCarPlay connect method found", data: [
            "triedSignatures": methodSignatures,
            "consequence": "React Native will NOT receive CarPlay connection event"
        ])
        print("[CarPlaySceneDelegate] RNCarPlay.connect method not found")
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
            sendRemoteLog(level: "info", message: "RNCarPlay.disconnect called")
            print("[CarPlaySceneDelegate] Successfully disconnected from RNCarPlay")
        } else {
            sendRemoteLog(level: "warn", message: "RNCarPlay.disconnect method not found")
        }
    }
    
    // MARK: - CPTemplateApplicationSceneDelegate
    
    /// Called when CarPlay connects to the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] ===== CarPlay CONNECTED (didConnect) =====")
        sendRemoteLog(level: "info", message: "===== CarPlay CONNECTED =====", data: [
            "delegateMethod": "templateApplicationScene:didConnect:",
            "hasWindow": false,
            "sceneState": "\(templateApplicationScene.activationState.rawValue)",
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ])
        
        self.interfaceController = interfaceController
        
        // Set loading template FIRST
        setLoadingTemplate(interfaceController: interfaceController)
        
        // Then connect to React Native
        safeConnectToRNCarPlay(interfaceController: interfaceController, window: templateApplicationScene.carWindow)
        
        // Schedule a check to see if template was replaced
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
            self?.checkIfStillShowingLoading()
        }
    }
    
    /// Called when CarPlay disconnects from the app
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        print("[CarPlaySceneDelegate] ===== CarPlay DISCONNECTED =====")
        sendRemoteLog(level: "info", message: "===== CarPlay DISCONNECTED =====")
        
        self.interfaceController = nil
        safeDisconnectFromRNCarPlay()
    }
    
    /// Called when CarPlay scene is about to connect (iOS 14+)
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlaySceneDelegate] ===== CarPlay CONNECTED WITH WINDOW (iOS 14+) =====")
        sendRemoteLog(level: "info", message: "===== CarPlay CONNECTED WITH WINDOW =====", data: [
            "delegateMethod": "templateApplicationScene:didConnect:to:",
            "windowBounds": "\(window.bounds)",
            "windowScreen": "\(window.screen)",
            "sceneState": "\(templateApplicationScene.activationState.rawValue)",
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ])
        
        self.interfaceController = interfaceController
        
        // Set loading template FIRST
        setLoadingTemplate(interfaceController: interfaceController)
        
        // Then connect to React Native
        safeConnectToRNCarPlay(interfaceController: interfaceController, window: window)
        
        // Schedule a check to see if template was replaced
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
            self?.checkIfStillShowingLoading()
        }
    }
    
    // MARK: - Template Management
    
    private func setLoadingTemplate(interfaceController: CPInterfaceController) {
        templateSetAttempts += 1
        
        sendRemoteLog(level: "info", message: "Setting LOADING template", data: [
            "attempt": templateSetAttempts
        ])
        
        let loadingItem = CPListItem(text: "MegaRadio", detailText: "Yükleniyor...")
        loadingItem.accessoryType = .disclosureIndicator
        
        let loadingSection = CPListSection(items: [loadingItem])
        let loadingTemplate = CPListTemplate(title: "MegaRadio", sections: [loadingSection])
        
        interfaceController.setRootTemplate(loadingTemplate, animated: false) { [weak self] success, error in
            if success {
                self?.sendRemoteLog(level: "info", message: "Loading template SET successfully", data: [
                    "title": "MegaRadio",
                    "detailText": "Yükleniyor...",
                    "waitingFor": "React Native to replace with tab bar template"
                ])
            } else {
                self?.sendRemoteLog(level: "error", message: "FAILED to set loading template", data: [
                    "error": error?.localizedDescription ?? "unknown",
                    "errorCode": (error as NSError?)?.code ?? -1
                ])
            }
        }
    }
    
    private func checkIfStillShowingLoading() {
        guard let controller = interfaceController else {
            sendRemoteLog(level: "warn", message: "InterfaceController is nil during check")
            return
        }
        
        let rootTemplate = controller.rootTemplate
        let templateDescription = String(describing: type(of: rootTemplate))
        
        // Check if it's still a list template (loading screen)
        let isStillLoading = rootTemplate is CPListTemplate
        
        sendRemoteLog(level: isStillLoading ? "warn" : "info", 
                      message: isStillLoading ? "STILL showing loading template after 5s!" : "Template was replaced", 
                      data: [
            "currentTemplateType": templateDescription,
            "isStillLoading": isStillLoading,
            "possibleCauses": isStillLoading ? [
                "1. RNCarPlay module not properly linked",
                "2. React Native CarPlay service not initialized",
                "3. Connection event not received by React Native",
                "4. Template creation failed in React Native",
                "5. API calls failing when fetching stations"
            ] : [],
            "templateStack": controller.templates.map { String(describing: type(of: $0)) }
        ])
        
        if isStillLoading {
            // Schedule another check
            DispatchQueue.main.asyncAfter(deadline: .now() + 10.0) { [weak self] in
                self?.checkIfStillShowingLoading()
            }
        }
    }
}
