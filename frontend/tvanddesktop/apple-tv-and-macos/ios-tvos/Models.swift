// Models.swift — Data models matching the MegaRadio backend API
//
// API base: https://api.themegaradio.com

import Foundation

struct Station: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let url: String?
    let urlResolved: String?
    let favicon: String?
    let country: String?
    let countryCode: String?
    let tags: String?
    let bitrate: Int?
    let codec: String?
    let votes: Int?
    let homepage: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, url, urlResolved, favicon, country, countryCode, tags
        case bitrate, codec, votes, homepage
    }

    var streamURL: URL? {
        if let resolved = urlResolved, let u = URL(string: resolved) { return u }
        if let raw = url, let u = URL(string: raw) { return u }
        return nil
    }

    var artworkURL: URL? {
        guard let fav = favicon, !fav.isEmpty else { return nil }
        return URL(string: fav)
    }

    var genreList: [String] {
        (tags ?? "").split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }
}

struct Genre: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let stationCount: Int?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name
        case stationCount
    }
}

struct Country: Codable, Identifiable, Hashable {
    var id: String { code }
    let name: String
    let code: String
    let flag: String?
    let stationCount: Int?
}

// API envelope for paginated lists
struct StationsResponse: Codable {
    let stations: [Station]?
    let data: [Station]?
    var items: [Station] { stations ?? data ?? [] }
}

struct GenresResponse: Codable {
    let genres: [Genre]?
    let data: [Genre]?
    var items: [Genre] { genres ?? data ?? [] }
}

// TV Login (pairing-code) responses
struct TVCodeResponse: Codable {
    let code: String
    let expiresAt: String?
}

struct TVCodeStatusResponse: Codable {
    let status: String // "pending" | "activated" | "expired"
    let token: String?
    let user: TVUser?
}

struct TVUser: Codable {
    let id: String?
    let displayName: String?
    let email: String?
}
