// AppState.swift
// Global application state for MegaRadio Watch App

import Foundation
import SwiftUI

// MARK: - App State
class AppState: ObservableObject {
    static let shared = AppState()
    
    // Current playback state
    @Published var currentStation: Station?
    @Published var isPlaying: Bool = false
    @Published var nowPlaying: NowPlaying?
    @Published var volume: Double = 0.5
    
    // Data lists
    @Published var favorites: [Station] = []
    @Published var genres: [Genre] = []
    @Published var countries: [Country] = []
    @Published var recentStations: [Station] = []
    
    // Connection state
    @Published var isPhoneConnected: Bool = false
    
    private let connectivityService = WatchConnectivityService.shared
    
    init() {
        setupDefaultData()
        setupNotificationObservers()
    }
    
    // MARK: - Setup Default Data
    private func setupDefaultData() {
        // Default genres
        genres = [
            Genre(id: "pop", name: "Pop"),
            Genre(id: "rock", name: "Rock"),
            Genre(id: "jazz", name: "Jazz"),
            Genre(id: "classical", name: "Klasik"),
            Genre(id: "electronic", name: "Elektronik"),
            Genre(id: "hiphop", name: "Hip-Hop"),
            Genre(id: "news", name: "Haber"),
            Genre(id: "sports", name: "Spor")
        ]
        
        // Default countries
        countries = [
            Country(code: "TR", name: "Turkiye", flagEmoji: "🇹🇷"),
            Country(code: "DE", name: "Almanya", flagEmoji: "🇩🇪"),
            Country(code: "FR", name: "Fransa", flagEmoji: "🇫🇷"),
            Country(code: "US", name: "Amerika", flagEmoji: "🇺🇸"),
            Country(code: "GB", name: "Ingiltere", flagEmoji: "🇬🇧"),
            Country(code: "ES", name: "Ispanya", flagEmoji: "🇪🇸"),
            Country(code: "IT", name: "Italya", flagEmoji: "🇮🇹"),
            Country(code: "NL", name: "Hollanda", flagEmoji: "🇳🇱")
        ]
    }
    
    // MARK: - Notification Observers
    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            forName: .nowPlayingUpdated,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let station = notification.object as? Station {
                self?.currentStation = station
            }
        }
        
        NotificationCenter.default.addObserver(
            forName: .playbackStateChanged,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let isPlaying = notification.object as? Bool {
                self?.isPlaying = isPlaying
            }
        }
    }
    
    // MARK: - Playback Control
    func playStation(_ station: Station) {
        currentStation = station
        isPlaying = true
        connectivityService.sendPlayCommand(stationId: station.id)
        
        // Add to recent
        if !recentStations.contains(where: { $0.id == station.id }) {
            recentStations.insert(station, at: 0)
            if recentStations.count > 10 {
                recentStations.removeLast()
            }
        }
    }
    
    func pause() {
        isPlaying = false
        connectivityService.sendPauseCommand()
    }
    
    func resume() {
        isPlaying = true
        connectivityService.sendResumeCommand()
    }
    
    func togglePlayPause() {
        if isPlaying {
            pause()
        } else {
            resume()
        }
    }
    
    // MARK: - Favorites Management
    func toggleFavorite(_ station: Station) {
        if let index = favorites.firstIndex(where: { $0.id == station.id }) {
            favorites.remove(at: index)
        } else {
            favorites.append(station)
        }
    }
    
    func isFavorite(_ station: Station) -> Bool {
        return favorites.contains(where: { $0.id == station.id })
    }
}
