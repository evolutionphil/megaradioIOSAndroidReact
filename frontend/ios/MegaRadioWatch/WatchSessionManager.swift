// WatchSessionManager.swift
// Handles communication between Watch and iOS app via WatchConnectivity

import Foundation
import WatchConnectivity
import Combine

// MARK: - Data Models
struct WatchStation: Codable, Identifiable {
    let id: String
    let name: String
    let logo: String?
    let streamUrl: String?
    let genre: String?
    let country: String?
}

struct WatchNowPlaying: Codable {
    let stationId: String?
    let stationName: String?
    let stationLogo: String?
    let songTitle: String?
    let artistName: String?
    let isPlaying: Bool
}

struct WatchGenre: Codable, Identifiable {
    var id: String { name }
    let name: String
    let icon: String
    let stationCount: Int
}

// MARK: - Watch Session Manager
class WatchSessionManager: NSObject, ObservableObject {
    static let shared = WatchSessionManager()
    
    // Published properties for SwiftUI
    @Published var favorites: [WatchStation] = []
    @Published var nowPlaying: WatchNowPlaying = WatchNowPlaying(
        stationId: nil,
        stationName: nil,
        stationLogo: nil,
        songTitle: nil,
        artistName: nil,
        isPlaying: false
    )
    @Published var genres: [WatchGenre] = []
    @Published var recentlyPlayed: [WatchStation] = []
    @Published var isConnected: Bool = false
    @Published var isReachable: Bool = false
    
    private var session: WCSession?
    
    override init() {
        super.init()
        
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }
    
    // MARK: - Send Commands to iOS App
    
    func sendPlayCommand() {
        sendMessage(["command": "play"])
    }
    
    func sendPauseCommand() {
        sendMessage(["command": "pause"])
    }
    
    func sendTogglePlayPause() {
        sendMessage(["command": "togglePlayPause"])
    }
    
    func sendNextStation() {
        sendMessage(["command": "nextStation"])
    }
    
    func sendPreviousStation() {
        sendMessage(["command": "previousStation"])
    }
    
    func playStation(id: String) {
        sendMessage(["command": "playStation", "stationId": id])
    }
    
    func requestFavorites() {
        sendMessage(["command": "requestFavorites"])
    }
    
    func requestNowPlaying() {
        sendMessage(["command": "requestNowPlaying"])
    }
    
    func requestGenres() {
        sendMessage(["command": "requestGenres"])
    }
    
    func requestRecentlyPlayed() {
        sendMessage(["command": "requestRecentlyPlayed"])
    }
    
    // MARK: - Private Methods
    
    private func sendMessage(_ message: [String: Any]) {
        guard let session = session, session.isReachable else {
            print("[WatchSession] iOS app not reachable")
            // Try to send via application context for when app is not active
            do {
                try session?.updateApplicationContext(message)
            } catch {
                print("[WatchSession] Failed to update context: \(error)")
            }
            return
        }
        
        session.sendMessage(message, replyHandler: { response in
            print("[WatchSession] Response received: \(response)")
            self.handleResponse(response)
        }, errorHandler: { error in
            print("[WatchSession] Error sending message: \(error)")
        })
    }
    
    private func handleResponse(_ response: [String: Any]) {
        DispatchQueue.main.async {
            // Handle favorites response
            if let favoritesData = response["favorites"] as? Data {
                if let favorites = try? JSONDecoder().decode([WatchStation].self, from: favoritesData) {
                    self.favorites = favorites
                }
            }
            
            // Handle now playing response
            if let nowPlayingData = response["nowPlaying"] as? Data {
                if let nowPlaying = try? JSONDecoder().decode(WatchNowPlaying.self, from: nowPlayingData) {
                    self.nowPlaying = nowPlaying
                }
            }
            
            // Handle genres response
            if let genresData = response["genres"] as? Data {
                if let genres = try? JSONDecoder().decode([WatchGenre].self, from: genresData) {
                    self.genres = genres
                }
            }
            
            // Handle recently played response
            if let recentData = response["recentlyPlayed"] as? Data {
                if let recent = try? JSONDecoder().decode([WatchStation].self, from: recentData) {
                    self.recentlyPlayed = recent
                }
            }
        }
    }
}

// MARK: - WCSessionDelegate
extension WatchSessionManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isConnected = activationState == .activated
            
            if activationState == .activated {
                print("[WatchSession] Session activated successfully")
                // Request initial data
                self.requestFavorites()
                self.requestNowPlaying()
                self.requestGenres()
            } else if let error = error {
                print("[WatchSession] Activation failed: \(error)")
            }
        }
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isReachable = session.isReachable
            print("[WatchSession] Reachability changed: \(session.isReachable)")
            
            if session.isReachable {
                // Request fresh data when connection established
                self.requestNowPlaying()
            }
        }
    }
    
    // Receive messages from iOS app
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        handleIncomingMessage(message)
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        handleIncomingMessage(message)
        replyHandler(["status": "received"])
    }
    
    // Receive application context updates
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        handleIncomingMessage(applicationContext)
    }
    
    private func handleIncomingMessage(_ message: [String: Any]) {
        DispatchQueue.main.async {
            // Update favorites
            if let favoritesData = message["favorites"] as? Data {
                if let favorites = try? JSONDecoder().decode([WatchStation].self, from: favoritesData) {
                    self.favorites = favorites
                    print("[WatchSession] Received \(favorites.count) favorites")
                }
            }
            
            // Update now playing
            if let nowPlayingData = message["nowPlaying"] as? Data {
                if let nowPlaying = try? JSONDecoder().decode(WatchNowPlaying.self, from: nowPlayingData) {
                    self.nowPlaying = nowPlaying
                    print("[WatchSession] Now playing updated: \(nowPlaying.stationName ?? "None")")
                }
            }
            
            // Update genres
            if let genresData = message["genres"] as? Data {
                if let genres = try? JSONDecoder().decode([WatchGenre].self, from: genresData) {
                    self.genres = genres
                    print("[WatchSession] Received \(genres.count) genres")
                }
            }
            
            // Update recently played
            if let recentData = message["recentlyPlayed"] as? Data {
                if let recent = try? JSONDecoder().decode([WatchStation].self, from: recentData) {
                    self.recentlyPlayed = recent
                }
            }
            
            // Handle playback state change
            if let isPlaying = message["isPlaying"] as? Bool {
                self.nowPlaying = WatchNowPlaying(
                    stationId: self.nowPlaying.stationId,
                    stationName: self.nowPlaying.stationName,
                    stationLogo: self.nowPlaying.stationLogo,
                    songTitle: self.nowPlaying.songTitle,
                    artistName: self.nowPlaying.artistName,
                    isPlaying: isPlaying
                )
            }
        }
    }
}
