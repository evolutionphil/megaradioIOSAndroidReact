// MegaRadioWatchApp.swift
// Main entry point for Apple Watch app

import SwiftUI

@main
struct MegaRadioWatchApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

// MARK: - App State
class AppState: ObservableObject {
    @Published var currentStation: Station?
    @Published var isPlaying: Bool = false
    @Published var favorites: [Station] = []
    @Published var genres: [Genre] = []
    @Published var countries: [Country] = []
    
    init() {
        loadMockData()
    }
    
    func loadMockData() {
        // Mock genres
        genres = [
            Genre(id: "jazz", name: "Jazz"),
            Genre(id: "slow", name: "Slow"),
            Genre(id: "dance", name: "Dance"),
            Genre(id: "hip-hop", name: "Hip Hop"),
            Genre(id: "pop", name: "Pop"),
            Genre(id: "rock", name: "Rock"),
        ]
        
        // Mock countries
        countries = [
            Country(code: "TR", name: "Turkey"),
            Country(code: "DE", name: "Germany"),
            Country(code: "FR", name: "France"),
            Country(code: "IT", name: "Italy"),
            Country(code: "US", name: "USA"),
            Country(code: "GB", name: "UK"),
        ]
        
        // Mock favorites
        favorites = [
            Station(id: "1", name: "Metro FM", country: "Turkey", city: "Istanbul", logoUrl: nil),
            Station(id: "2", name: "Power Türk", country: "Turkey", city: "Istanbul", logoUrl: nil),
        ]
    }
    
    func playStation(_ station: Station) {
        currentStation = station
        isPlaying = true
        // TODO: Send message to iPhone app via WatchConnectivity
    }
    
    func togglePlayPause() {
        isPlaying.toggle()
        // TODO: Send message to iPhone app
    }
    
    func nextStation() {
        // TODO: Implement next station logic
    }
    
    func previousStation() {
        // TODO: Implement previous station logic
    }
}

// MARK: - Models
struct Station: Identifiable, Codable {
    let id: String
    let name: String
    let country: String?
    let city: String?
    let logoUrl: String?
    
    var locationText: String {
        if let country = country, let city = city {
            return "\(country), \(city)"
        } else if let country = country {
            return country
        }
        return ""
    }
}

struct Genre: Identifiable, Codable {
    let id: String
    let name: String
}

struct Country: Identifiable, Codable {
    let code: String
    let name: String
    
    var id: String { code }
}
