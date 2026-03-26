// ATTModule.swift
// Minimal native module for iOS App Tracking Transparency (ATT)
// Exposes requestTrackingAuthorization() to React Native JS without any 3rd party dependency

import Foundation
import AppTrackingTransparency

@objc(ATTModule)
class ATTModule: NSObject {

  /// Request ATT permission from the user
  /// Returns: "granted", "denied", "restricted", "not-determined", or "unavailable"
  @objc func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14, *) {
      // Must be called on main thread
      DispatchQueue.main.async {
        ATTrackingManager.requestTrackingAuthorization { status in
          resolve(self.statusToString(status))
        }
      }
    } else {
      // iOS < 14 doesn't have ATT, tracking is allowed by default
      resolve("granted")
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
