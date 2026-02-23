// Models.swift
// Data models for MegaRadio Watch App

import Foundation

// MARK: - Station Model
struct Station: Identifiable, Codable, Equatable {
    let id: String
    let name: String
    var country: String?
    var city: String?
    var logoUrl: String?
    var streamUrl: String?
    var genre: String?
    
    static func == (lhs: Station, rhs: Station) -> Bool {
        return lhs.id == rhs.id
    }
}

// MARK: - Genre Model
struct Genre: Identifiable, Codable {
    let id: String
    let name: String
    var imageUrl: String?
    var stationCount: Int?
}

// MARK: - Country Model
struct Country: Identifiable, Codable {
    var id: String { code }
    let code: String
    let name: String
    var flagEmoji: String?
    var stationCount: Int?
}

// MARK: - Now Playing Model
struct NowPlaying {
    var title: String?
    var artist: String?
    var albumArt: String?
}

// MARK: - Playback Command
enum PlaybackCommand: String {
    case play
    case pause
    case next
    case previous
    case stop
}
