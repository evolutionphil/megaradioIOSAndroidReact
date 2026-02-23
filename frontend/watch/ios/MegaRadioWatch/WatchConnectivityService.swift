// WatchConnectivityService.swift
// Handles communication between iPhone app and Apple Watch

import Foundation
import WatchConnectivity

class WatchConnectivityService: NSObject, ObservableObject {
    static let shared = WatchConnectivityService()
    
    // Published properties for UI binding
    @Published var currentStation: Station?
    @Published var nowPlaying: NowPlaying?
    @Published var isPlaying: Bool = false
    @Published var volume: Double = 0.5
    @Published var isPhoneReachable: Bool = false
    
    // Data lists
    @Published var receivedStations: [Station] = []
    @Published var receivedFavorites: [Station] = []
    @Published var receivedGenres: [Genre] = []
    @Published var receivedCountries: [Country] = []
    
    private var session: WCSession?
    
    override init() {
        super.init()
        
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }
    
    // MARK: - Volume Control
    func setVolume(_ newVolume: Double) {
        volume = newVolume
        guard let session = session, session.isReachable else { return }
        
        let message: [String: Any] = [
            "command": "setVolume",
            "volume": newVolume
        ]
        session.sendMessage(message, replyHandler: nil) { error in
            print("[WatchConnectivity] Error setting volume: \(error)")
        }
    }
    
    // MARK: - Send Command
    func sendCommand(_ command: PlaybackCommand) {
        guard let session = session, session.isReachable else {
            print("[WatchConnectivity] iPhone not reachable")
            return
        }
        
        let message: [String: Any] = ["command": command.rawValue]
        
        session.sendMessage(message, replyHandler: nil) { error in
            print("[WatchConnectivity] Error sending command \(command.rawValue): \(error)")
        }
        
        // Update local state
        switch command {
        case .play:
            isPlaying = true
        case .pause, .stop:
            isPlaying = false
        default:
            break
        }
    }
    
    // MARK: - Send Messages to iPhone
    func sendPlayCommand(stationId: String) {
        guard let session = session, session.isReachable else {
            print("[WatchConnectivity] iPhone not reachable")
            return
        }
        
        let message: [String: Any] = [
            "command": "play",
            "stationId": stationId
        ]
        
        session.sendMessage(message, replyHandler: nil) { error in
            print("[WatchConnectivity] Error sending play command: \(error)")
        }
        
        isPlaying = true
    }
    
    func sendPauseCommand() {
        guard let session = session, session.isReachable else { return }
        
        let message: [String: Any] = ["command": "pause"]
        session.sendMessage(message, replyHandler: nil) { error in
            print("[WatchConnectivity] Error sending pause command: \(error)")
        }
        
        isPlaying = false
    }
    
    func sendResumeCommand() {
        guard let session = session, session.isReachable else { return }
        
        let message: [String: Any] = ["command": "resume"]
        session.sendMessage(message, replyHandler: nil) { error in
            print("[WatchConnectivity] Error sending resume command: \(error)")
        }
        
        isPlaying = true
    }
    
    func requestStations(forGenre genre: String? = nil, forCountry country: String? = nil) {
        guard let session = session, session.isReachable else { return }
        
        var message: [String: Any] = ["command": "getStations"]
        if let genre = genre {
            message["genre"] = genre
        }
        if let country = country {
            message["country"] = country
        }
        
        session.sendMessage(message, replyHandler: { response in
            if let stationsData = response["stations"] as? [[String: Any]] {
                let stations = stationsData.compactMap { self.parseStation($0) }
                DispatchQueue.main.async {
                    self.receivedStations = stations
                }
            }
        }) { error in
            print("[WatchConnectivity] Error requesting stations: \(error)")
        }
    }
    
    func requestFavorites() {
        guard let session = session, session.isReachable else { return }
        
        let message: [String: Any] = ["command": "getFavorites"]
        session.sendMessage(message, replyHandler: { response in
            if let stationsData = response["favorites"] as? [[String: Any]] {
                let favorites = stationsData.compactMap { self.parseStation($0) }
                DispatchQueue.main.async {
                    self.receivedFavorites = favorites
                }
            }
        }) { error in
            print("[WatchConnectivity] Error requesting favorites: \(error)")
        }
    }
    
    func requestGenres() {
        guard let session = session, session.isReachable else { return }
        
        let message: [String: Any] = ["command": "getGenres"]
        session.sendMessage(message, replyHandler: { response in
            if let genresData = response["genres"] as? [[String: Any]] {
                let genres = genresData.compactMap { self.parseGenre($0) }
                DispatchQueue.main.async {
                    self.receivedGenres = genres
                }
            }
        }) { error in
            print("[WatchConnectivity] Error requesting genres: \(error)")
        }
    }
    
    func requestCountries() {
        guard let session = session, session.isReachable else { return }
        
        let message: [String: Any] = ["command": "getCountries"]
        session.sendMessage(message, replyHandler: { response in
            if let countriesData = response["countries"] as? [[String: Any]] {
                let countries = countriesData.compactMap { self.parseCountry($0) }
                DispatchQueue.main.async {
                    self.receivedCountries = countries
                }
            }
        }) { error in
            print("[WatchConnectivity] Error requesting countries: \(error)")
        }
    }
    
    // MARK: - Parse Helpers
    private func parseStation(_ data: [String: Any]) -> Station? {
        guard let id = data["id"] as? String,
              let name = data["name"] as? String else {
            return nil
        }
        
        return Station(
            id: id,
            name: name,
            country: data["country"] as? String,
            city: data["city"] as? String,
            logoUrl: data["logoUrl"] as? String,
            streamUrl: data["streamUrl"] as? String,
            genre: data["genre"] as? String
        )
    }
    
    private func parseGenre(_ data: [String: Any]) -> Genre? {
        guard let id = data["id"] as? String,
              let name = data["name"] as? String else {
            return nil
        }
        return Genre(id: id, name: name)
    }
    
    private func parseCountry(_ data: [String: Any]) -> Country? {
        guard let code = data["code"] as? String,
              let name = data["name"] as? String else {
            return nil
        }
        return Country(code: code, name: name)
    }
}

// MARK: - WCSessionDelegate
extension WatchConnectivityService: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isPhoneReachable = session.isReachable
        }
        
        if let error = error {
            print("[WatchConnectivity] Activation error: \(error)")
        } else {
            print("[WatchConnectivity] Activated with state: \(activationState.rawValue)")
        }
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isPhoneReachable = session.isReachable
        }
        print("[WatchConnectivity] Reachability changed: \(session.isReachable)")
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        DispatchQueue.main.async {
            self.handleIncomingMessage(message)
        }
    }
    
    private func handleIncomingMessage(_ message: [String: Any]) {
        if let command = message["command"] as? String {
            switch command {
            case "nowPlaying":
                if let stationData = message["station"] as? [String: Any],
                   let station = parseStation(stationData) {
                    currentStation = station
                    NotificationCenter.default.post(
                        name: .nowPlayingUpdated,
                        object: station
                    )
                }
                
                // Parse now playing info
                if let title = message["title"] as? String {
                    nowPlaying = NowPlaying(
                        title: title,
                        artist: message["artist"] as? String,
                        albumArt: message["albumArt"] as? String
                    )
                }
                
            case "playbackStateChanged":
                if let playing = message["isPlaying"] as? Bool {
                    isPlaying = playing
                    NotificationCenter.default.post(
                        name: .playbackStateChanged,
                        object: playing
                    )
                }
                
            case "volumeChanged":
                if let newVolume = message["volume"] as? Double {
                    volume = newVolume
                }
                
            default:
                break
            }
        }
    }
}

// MARK: - Notification Names
extension Notification.Name {
    static let nowPlayingUpdated = Notification.Name("nowPlayingUpdated")
    static let playbackStateChanged = Notification.Name("playbackStateChanged")
}
