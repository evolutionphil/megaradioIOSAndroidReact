// ATTModule.swift
// Native module for iOS App Tracking Transparency (ATT)
// Handles proper lifecycle timing for ATT prompt display

import Foundation
import AppTrackingTransparency
import UIKit

@objc(ATTModule)
class ATTModule: NSObject {

  /// Request ATT permission from the user
  /// Returns: "granted", "denied", "restricted", "not-determined", or "unavailable"
  @objc func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14, *) {
      // Check current status first - if already determined, return immediately
      let currentStatus = ATTrackingManager.trackingAuthorizationStatus
      if currentStatus != .notDetermined {
        resolve(statusToString(currentStatus))
        return
      }
      
      // Must be called on main thread AND when app is active
      DispatchQueue.main.async {
        // Verify app is in active state (applicationDidBecomeActive must have fired)
        let appState = UIApplication.shared.applicationState
        if appState != .active {
          // App not yet active - wait for it to become active
          print("[ATTModule] App not active (state: \(appState.rawValue)), waiting for active state...")
          self.waitForActiveAndRequest(resolve: resolve)
          return
        }
        
        // App is active - request ATT with a small delay for UI stability
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
          ATTrackingManager.requestTrackingAuthorization { status in
            print("[ATTModule] ATT result: \(self.statusToString(status))")
            resolve(self.statusToString(status))
          }
        }
      }
    } else {
      // iOS < 14 doesn't have ATT, tracking is allowed by default
      resolve("granted")
    }
  }
  
  /// Wait for app to become active then request ATT
  @available(iOS 14, *)
  private func waitForActiveAndRequest(resolve: @escaping RCTPromiseResolveBlock) {
    var observer: NSObjectProtocol?
    observer = NotificationCenter.default.addObserver(
      forName: UIApplication.didBecomeActiveNotification,
      object: nil,
      queue: .main
    ) { _ in
      // Remove observer immediately
      if let obs = observer {
        NotificationCenter.default.removeObserver(obs)
      }
      
      // Small delay after becoming active for UI stability
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
        ATTrackingManager.requestTrackingAuthorization { status in
          print("[ATTModule] ATT result (after wait): \(self.statusToString(status))")
          resolve(self.statusToString(status))
        }
      }
    }
    
    // Timeout after 15s to prevent hanging
    DispatchQueue.main.asyncAfter(deadline: .now() + 15.0) {
      if let obs = observer {
        NotificationCenter.default.removeObserver(obs)
      }
      let currentStatus = ATTrackingManager.trackingAuthorizationStatus
      if currentStatus == .notDetermined {
        // Last attempt
        ATTrackingManager.requestTrackingAuthorization { status in
          resolve(self.statusToString(status))
        }
      } else {
        resolve(self.statusToString(currentStatus))
      }
    }
  }

  /// Get current ATT status without prompting
  @objc func getStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14, *) {
      let status = ATTrackingManager.trackingAuthorizationStatus
      resolve(statusToString(status))
    } else {
      resolve("granted")
    }
  }

  @available(iOS 14, *)
  private func statusToString(_ status: ATTrackingManager.AuthorizationStatus) -> String {
    switch status {
    case .authorized:
      return "granted"
    case .denied:
      return "denied"
    case .restricted:
      return "restricted"
    case .notDetermined:
      return "not-determined"
    @unknown default:
      return "unknown"
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
