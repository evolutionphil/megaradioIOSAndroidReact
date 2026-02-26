// WatchConnectivityBridge.swift
// Swift implementation of React Native bridge for WatchConnectivity
// Add this file to the main iOS target (MegaRadio)

import Foundation
import WatchConnectivity
import React

@objc(WatchConnectivityBridge)
class WatchConnectivityBridge: RCTEventEmitter {
    
    private var hasListeners = false
    
    override init() {
        super.init()
        setupNotificationObservers()
    }
    
    // MARK: - RCTEventEmitter
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return [
            "onWatchCommand",
            "onWatchReachabilityChanged"
        ]
    }
    
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    // MARK: - Notification Observers
    
    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleWatchCommand(_:)),
            name: Notification.Name("WatchCommandPlay"),
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleWatchCommand(_:)),
            name: Notification.Name("WatchCommandPause"),
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleWatchCommand(_:)),
            name: Notification.Name("WatchCommandToggle"),
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleWatchCommand(_:)),
            name: Notification.Name("WatchCommandNext"),
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleWatchCommand(_:)),
            name: Notification.Name("WatchCommandPrevious"),
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handlePlayStationCommand(_:)),
            name: Notification.Name("WatchCommandPlayStation"),
            object: nil
        )
    }
    
    @objc private func handleWatchCommand(_ notification: Notification) {
        guard hasListeners else { return }
        
        var command = ""
        switch notification.name.rawValue {
        case "WatchCommandPlay":
            command = "play"
        case "WatchCommandPause":
            command = "pause"
        case "WatchCommandToggle":
            command = "togglePlayPause"
        case "WatchCommandNext":
            command = "nextStation"
        case "WatchCommandPrevious":
            command = "previousStation"
        default:
            return
        }
        
        sendEvent(withName: "onWatchCommand", body: ["command": command])
    }
    
    @objc private func handlePlayStationCommand(_ notification: Notification) {
        guard hasListeners else { return }
        guard let userInfo = notification.userInfo,
              let stationId = userInfo["stationId"] as? String else { return }
        
        sendEvent(withName: "onWatchCommand", body: [
            "command": "playStation",
            "stationId": stationId
        ])
    }
    
    // MARK: - Exported Methods
    
    @objc func updateFavorites(_ favorites: [[String: Any]]) {
        WatchConnectivityHandler.shared.updateFavorites(favorites)
    }
    
    @objc func updateNowPlaying(_ nowPlaying: [String: Any]) {
        WatchConnectivityHandler.shared.updateNowPlaying(nowPlaying)
    }
    
    @objc func updateGenres(_ genres: [[String: Any]]) {
        WatchConnectivityHandler.shared.updateGenres(genres)
    }
    
    @objc func updatePlaybackState(_ isPlaying: Bool) {
        WatchConnectivityHandler.shared.updatePlaybackState(isPlaying)
    }
    
    @objc func isWatchAppInstalled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if WCSession.isSupported() {
            let session = WCSession.default
            resolve(session.isWatchAppInstalled)
        } else {
            resolve(false)
        }
    }
}
