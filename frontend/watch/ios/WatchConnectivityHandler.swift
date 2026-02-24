// WatchConnectivityHandler.swift
// iOS side handler for Apple Watch communication
// This file should be added to the main iOS target (MegaRadio)

import Foundation
import WatchConnectivity

@objc(WatchConnectivityHandler)
class WatchConnectivityHandler: NSObject {
    
    static let shared = WatchConnectivityHandler()
    
    private var session: WCSession?
    
    // Store current data to send to watch
    private var currentFavorites: [[String: Any]] = []
    private var currentNowPlaying: [String: Any] = [:]
    private var currentGenres: [[String: Any]] = []
    
    override init() {
        super.init()
        
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }
    
    // MARK: - Public Methods (Called from React Native)
    
    @objc func updateFavorites(_ favorites: [[String: Any]]) {
        currentFavorites = favorites
        sendFavoritesToWatch()
    }
    
    @objc func updateNowPlaying(_ nowPlaying: [String: Any]) {
        currentNowPlaying = nowPlaying
        sendNowPlayingToWatch()
    }
    
    @objc func updateGenres(_ genres: [[String: Any]]) {
        currentGenres = genres
        sendGenresToWatch()
    }
    
    @objc func updatePlaybackState(_ isPlaying: Bool) {
        sendMessageToWatch(["isPlaying": isPlaying])
    }
    
    // MARK: - Private Methods
    
    private func sendFavoritesToWatch() {
        // Convert to WatchStation format
        let stations = currentFavorites.map { fav -> [String: Any] in
            return [
                "id": fav["_id"] as? String ?? fav["id"] as? String ?? UUID().uuidString,
                "name": fav["name"] as? String ?? "",
                "logo": fav["logo"] as? String ?? fav["favicon"] as? String ?? "",
                "streamUrl": fav["streamUrl"] as? String ?? fav["url_resolved"] as? String ?? "",
                "genre": (fav["genres"] as? [String])?.first ?? fav["genre"] as? String ?? "",
                "country": fav["country"] as? String ?? ""
            ]
        }
        
        if let data = try? JSONSerialization.data(withJSONObject: stations) {
            sendMessageToWatch(["favorites": data])
        }
    }
    
    private func sendNowPlayingToWatch() {
        let nowPlayingData: [String: Any] = [
            "stationId": currentNowPlaying["stationId"] ?? "",
            "stationName": currentNowPlaying["stationName"] ?? "",
            "stationLogo": currentNowPlaying["stationLogo"] ?? "",
            "songTitle": currentNowPlaying["songTitle"] ?? "",
            "artistName": currentNowPlaying["artistName"] ?? "",
            "isPlaying": currentNowPlaying["isPlaying"] as? Bool ?? false
        ]
        
        if let data = try? JSONSerialization.data(withJSONObject: nowPlayingData) {
            sendMessageToWatch(["nowPlaying": data])
        }
    }
    
    private func sendGenresToWatch() {
        let genres = currentGenres.map { genre -> [String: Any] in
            return [
                "name": genre["name"] as? String ?? "",
                "icon": genre["icon"] as? String ?? "radio",
                "stationCount": genre["stationCount"] as? Int ?? 0
            ]
        }
        
        if let data = try? JSONSerialization.data(withJSONObject: genres) {
            sendMessageToWatch(["genres": data])
        }
    }
    
    private func sendMessageToWatch(_ message: [String: Any]) {
        guard let session = session else { return }
        
        if session.isReachable {
            session.sendMessage(message, replyHandler: nil) { error in
                print("[WatchHandler] Error sending message: \(error)")
            }
        } else {
            // Use application context for background updates
            do {
                var context = session.applicationContext
                for (key, value) in message {
                    context[key] = value
                }
                try session.updateApplicationContext(context)
            } catch {
                print("[WatchHandler] Error updating context: \(error)")
            }
        }
    }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityHandler: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            print("[WatchHandler] Session activated")
            // Send current data to watch
            sendFavoritesToWatch()
            sendNowPlayingToWatch()
            sendGenresToWatch()
        }
    }
    
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("[WatchHandler] Session inactive")
    }
    
    func sessionDidDeactivate(_ session: WCSession) {
        print("[WatchHandler] Session deactivated")
        // Reactivate session
        session.activate()
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        print("[WatchHandler] Reachability changed: \(session.isReachable)")
        if session.isReachable {
            // Send latest data when watch becomes reachable
            sendNowPlayingToWatch()
        }
    }
    
    // Handle messages from Watch
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        handleWatchMessage(message)
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        handleWatchMessage(message)
        
        // Send response with current data
        var response: [String: Any] = [:]
        
        if let favData = try? JSONSerialization.data(withJSONObject: currentFavorites) {
            response["favorites"] = favData
        }
        if let npData = try? JSONSerialization.data(withJSONObject: currentNowPlaying) {
            response["nowPlaying"] = npData
        }
        if let genreData = try? JSONSerialization.data(withJSONObject: currentGenres) {
            response["genres"] = genreData
        }
        
        replyHandler(response)
    }
    
    private func handleWatchMessage(_ message: [String: Any]) {
        guard let command = message["command"] as? String else { return }
        
        print("[WatchHandler] Received command: \(command)")
        
        // Post notification to React Native
        DispatchQueue.main.async {
            switch command {
            case "play":
                NotificationCenter.default.post(name: Notification.Name("WatchCommandPlay"), object: nil)
            case "pause":
                NotificationCenter.default.post(name: Notification.Name("WatchCommandPause"), object: nil)
            case "togglePlayPause":
                NotificationCenter.default.post(name: Notification.Name("WatchCommandToggle"), object: nil)
            case "nextStation":
                NotificationCenter.default.post(name: Notification.Name("WatchCommandNext"), object: nil)
            case "previousStation":
                NotificationCenter.default.post(name: Notification.Name("WatchCommandPrevious"), object: nil)
            case "playStation":
                if let stationId = message["stationId"] as? String {
                    NotificationCenter.default.post(
                        name: Notification.Name("WatchCommandPlayStation"),
                        object: nil,
                        userInfo: ["stationId": stationId]
                    )
                }
            case "requestFavorites":
                self.sendFavoritesToWatch()
            case "requestNowPlaying":
                self.sendNowPlayingToWatch()
            case "requestGenres":
                self.sendGenresToWatch()
            default:
                break
            }
        }
    }
}
