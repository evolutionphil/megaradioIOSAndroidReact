import Foundation
import Intents
import IntentsUI

/**
 * VoiceCommandHandler - Siri Voice Commands for MegaRadio CarPlay
 * 
 * Implements INPlayMediaIntentHandling for Siri voice commands like:
 * - "Hey Siri, play MegaRadio"
 * - "Hey Siri, play pop music on MegaRadio"
 * - "Hey Siri, play [station name]"
 * - "Hey Siri, play jazz radio"
 * 
 * This class handles:
 * 1. Resolve - Search stations/genres based on user query
 * 2. Confirm - Validate the request
 * 3. Handle - Execute playback via the app
 * 
 * Requirements:
 * - Siri capability enabled in Xcode
 * - INPlayMediaIntent in Info.plist (NSUserActivityTypes)
 * - Background Modes: Audio, AirPlay, and Picture in Picture
 */
class VoiceCommandHandler: NSObject, INPlayMediaIntentHandling {
    
    static let shared = VoiceCommandHandler()
    
    private let logPrefix = "[VoiceCommand]"
    private let apiKey = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"
    private let baseURL = "https://themegaradio.com"
    
    private override init() {
        super.init()
        print("\(logPrefix) Handler initialized")
    }
    
    // MARK: - INPlayMediaIntentHandling
    
    /**
     * RESOLVE: Search for media items based on user's voice query
     * Called when Siri receives a play request
     */
    func resolveMediaItems(for intent: INPlayMediaIntent, 
                          with completion: @escaping ([INPlayMediaMediaItemResolutionResult]) -> Void) {
        
        print("\(logPrefix) Resolving media items...")
        
        guard let mediaSearch = intent.mediaSearch else {
            print("\(logPrefix) No media search provided - playing default")
            // No specific query - return app default (popular stations)
            let defaultItem = createMediaItem(
                identifier: "popular",
                title: "MegaRadio Popular",
                type: .station,
                artist: "MegaRadio"
            )
            completion([.success(with: defaultItem)])
            return
        }
        
        // Extract search parameters
        let searchQuery = mediaSearch.mediaName ?? ""
        let mediaType = mediaSearch.mediaType
        let genreNames = mediaSearch.genreNames ?? []
        
        print("\(logPrefix) Search query: '\(searchQuery)', type: \(mediaType.rawValue), genres: \(genreNames)")
        
        // Search based on media type
        switch mediaType {
        case .station:
            searchStations(query: searchQuery) { items in
                completion(items.map { .success(with: $0) })
            }
            
        case .genre, .playlist:
            if !genreNames.isEmpty {
                searchByGenre(genreNames: genreNames) { items in
                    completion(items.map { .success(with: $0) })
                }
            } else {
                searchStations(query: searchQuery) { items in
                    completion(items.map { .success(with: $0) })
                }
            }
            
        case .music, .song, .artist, .album:
            // For general music queries, search stations
            searchStations(query: searchQuery) { items in
                completion(items.map { .success(with: $0) })
            }
            
        default:
            // Default: search by query string
            if searchQuery.isEmpty {
                let defaultItem = self.createMediaItem(
                    identifier: "popular",
                    title: "MegaRadio Popular",
                    type: .station,
                    artist: "MegaRadio"
                )
                completion([.success(with: defaultItem)])
            } else {
                searchStations(query: searchQuery) { items in
                    completion(items.map { .success(with: $0) })
                }
            }
        }
    }
    
    /**
     * CONFIRM: Validate the request before execution
     */
    func confirm(intent: INPlayMediaIntent, 
                completion: @escaping (INPlayMediaIntentResponse) -> Void) {
        
        print("\(logPrefix) Confirming intent...")
        
        // Check if we have media items to play
        if let mediaItems = intent.mediaItems, !mediaItems.isEmpty {
            print("\(logPrefix) Confirmed with \(mediaItems.count) items")
            completion(INPlayMediaIntentResponse(code: .ready, userActivity: nil))
        } else {
            // Even without specific items, we can play popular stations
            print("\(logPrefix) No specific items - will play default")
            completion(INPlayMediaIntentResponse(code: .ready, userActivity: nil))
        }
    }
    
    /**
     * HANDLE: Execute the playback command
     * Uses continueInApp to launch the app and start playback
     */
    func handle(intent: INPlayMediaIntent, 
               completion: @escaping (INPlayMediaIntentResponse) -> Void) {
        
        print("\(logPrefix) Handling intent...")
        
        // Create user activity with playback info
        let userActivity = NSUserActivity(activityType: "com.visiongo.megaradio.playMedia")
        userActivity.title = "Play MegaRadio"
        
        // Add media info to user activity
        if let mediaItems = intent.mediaItems, let firstItem = mediaItems.first {
            userActivity.userInfo = [
                "mediaIdentifier": firstItem.identifier ?? "popular",
                "mediaTitle": firstItem.title ?? "MegaRadio",
                "mediaType": firstItem.type.rawValue,
                "source": "siri"
            ]
            print("\(logPrefix) Playing: \(firstItem.title ?? "unknown")")
        } else {
            userActivity.userInfo = [
                "mediaIdentifier": "popular",
                "mediaTitle": "MegaRadio Popular",
                "source": "siri"
            ]
            print("\(logPrefix) Playing default: popular stations")
        }
        
        // Continue in app - this will launch/wake the app
        completion(INPlayMediaIntentResponse(code: .continueInApp, userActivity: userActivity))
    }
    
    // MARK: - Search Methods
    
    /**
     * Search stations by name/query
     */
    private func searchStations(query: String, completion: @escaping ([INMediaItem]) -> Void) {
        print("\(logPrefix) Searching stations: '\(query)'")
        
        // First check local cache
        if let cachedStations = CarPlayCacheManager.shared.loadStationsWithStaleFallback(forKey: "popular") {
            let filtered = filterStations(cachedStations, query: query)
            if !filtered.isEmpty {
                print("\(logPrefix) Found \(filtered.count) stations in cache")
                completion(filtered)
                return
            }
        }
        
        // Fallback to API search
        guard let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseURL)/api/stations/search?q=\(encodedQuery)&limit=10&tv=1") else {
            completion([createDefaultMediaItem()])
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.timeoutInterval = 5
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            guard let data = data, error == nil,
                  let stations = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                print("\(self.logPrefix) API search failed - using default")
                completion([self.createDefaultMediaItem()])
                return
            }
            
            let mediaItems = stations.prefix(5).compactMap { station -> INMediaItem? in
                guard let name = station["name"] as? String,
                      let id = station["_id"] as? String ?? station["id"] as? String else {
                    return nil
                }
                return self.createMediaItem(
                    identifier: id,
                    title: name,
                    type: .station,
                    artist: station["country"] as? String ?? "Radio"
                )
            }
            
            print("\(self.logPrefix) API returned \(mediaItems.count) stations")
            completion(mediaItems.isEmpty ? [self.createDefaultMediaItem()] : mediaItems)
        }.resume()
    }
    
    /**
     * Search by genre names
     */
    private func searchByGenre(genreNames: [String], completion: @escaping ([INMediaItem]) -> Void) {
        print("\(logPrefix) Searching by genres: \(genreNames)")
        
        // Map common genre names to slugs
        let genreSlug = mapGenreNameToSlug(genreNames.first ?? "")
        
        guard let url = URL(string: "\(baseURL)/api/genres/\(genreSlug)/stations?limit=10&tv=1") else {
            completion([createDefaultMediaItem()])
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.timeoutInterval = 5
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self = self else { return }
            
            guard let data = data, error == nil,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let stations = json["stations"] as? [[String: Any]] else {
                completion([self.createDefaultMediaItem()])
                return
            }
            
            let mediaItems = stations.prefix(5).compactMap { station -> INMediaItem? in
                guard let name = station["name"] as? String,
                      let id = station["_id"] as? String ?? station["id"] as? String else {
                    return nil
                }
                return self.createMediaItem(
                    identifier: id,
                    title: name,
                    type: .station,
                    artist: genreNames.first ?? "Radio"
                )
            }
            
            completion(mediaItems.isEmpty ? [self.createDefaultMediaItem()] : mediaItems)
        }.resume()
    }
    
    // MARK: - Helper Methods
    
    private func filterStations(_ stations: [[String: Any]], query: String) -> [INMediaItem] {
        let lowercaseQuery = query.lowercased()
        
        return stations.filter { station in
            let name = (station["name"] as? String)?.lowercased() ?? ""
            let genre = (station["genre"] as? String)?.lowercased() ?? ""
            let tags = (station["tags"] as? String)?.lowercased() ?? ""
            
            return name.contains(lowercaseQuery) || 
                   genre.contains(lowercaseQuery) || 
                   tags.contains(lowercaseQuery)
        }.prefix(5).compactMap { station -> INMediaItem? in
            guard let name = station["name"] as? String,
                  let id = station["_id"] as? String ?? station["id"] as? String ?? station["favicon"] as? String else {
                return nil
            }
            return createMediaItem(
                identifier: id,
                title: name,
                type: .station,
                artist: station["country"] as? String ?? "Radio"
            )
        }
    }
    
    private func createMediaItem(identifier: String, title: String, type: INMediaItemType, artist: String?) -> INMediaItem {
        return INMediaItem(
            identifier: identifier,
            title: title,
            type: type,
            artwork: nil,
            artist: artist
        )
    }
    
    private func createDefaultMediaItem() -> INMediaItem {
        return createMediaItem(
            identifier: "popular",
            title: "MegaRadio Popular",
            type: .station,
            artist: "MegaRadio"
        )
    }
    
    private func mapGenreNameToSlug(_ name: String) -> String {
        let mappings: [String: String] = [
            "pop": "pop",
            "rock": "rock",
            "jazz": "jazz",
            "classical": "classical",
            "electronic": "electronic",
            "hip hop": "hip-hop",
            "hip-hop": "hip-hop",
            "country": "country",
            "r&b": "r-n-b",
            "rnb": "r-n-b",
            "news": "news",
            "talk": "talk",
            "sports": "sports"
        ]
        return mappings[name.lowercased()] ?? name.lowercased().replacingOccurrences(of: " ", with: "-")
    }
    
    // MARK: - App Integration
    
    /**
     * Handle incoming user activity from Siri
     * Call this from AppDelegate/SceneDelegate
     */
    static func handleUserActivity(_ userActivity: NSUserActivity) -> Bool {
        guard userActivity.activityType == "com.visiongo.megaradio.playMedia" else {
            return false
        }
        
        let userInfo = userActivity.userInfo ?? [:]
        let mediaIdentifier = userInfo["mediaIdentifier"] as? String ?? "popular"
        let mediaTitle = userInfo["mediaTitle"] as? String ?? "MegaRadio"
        
        print("[VoiceCommand] Handling user activity: \(mediaTitle) (\(mediaIdentifier))")
        
        // Post notification for React Native to handle playback
        NotificationCenter.default.post(
            name: NSNotification.Name("SiriPlaybackRequest"),
            object: nil,
            userInfo: [
                "identifier": mediaIdentifier,
                "title": mediaTitle,
                "source": "siri"
            ]
        )
        
        return true
    }
    
    /**
     * Donate interaction for Siri suggestions
     * Call this after user plays a station
     */
    static func donatePlaybackInteraction(stationId: String, stationName: String) {
        let mediaItem = INMediaItem(
            identifier: stationId,
            title: stationName,
            type: .station,
            artwork: nil,
            artist: "MegaRadio"
        )
        
        let intent = INPlayMediaIntent(
            mediaItems: [mediaItem],
            mediaContainer: nil,
            playShuffled: false,
            playbackRepeatMode: .none,
            resumePlayback: true,
            playbackQueueLocation: .now,
            playbackSpeed: 1.0,
            mediaSearch: nil
        )
        
        let interaction = INInteraction(intent: intent, response: nil)
        interaction.donate { error in
            if let error = error {
                print("[VoiceCommand] Donation error: \(error.localizedDescription)")
            } else {
                print("[VoiceCommand] Donated interaction for: \(stationName)")
            }
        }
    }
}

// MARK: - Supported Voice Commands Documentation

/*
 * SUPPORTED SIRI VOICE COMMANDS:
 * 
 * General Playback:
 * - "Hey Siri, play MegaRadio"
 * - "Hey Siri, open MegaRadio"
 * - "Hey Siri, play radio on MegaRadio"
 * 
 * Station Search:
 * - "Hey Siri, play [station name] on MegaRadio"
 * - "Hey Siri, play BBC Radio on MegaRadio"
 * - "Hey Siri, play Virgin Radio"
 * 
 * Genre Search:
 * - "Hey Siri, play jazz on MegaRadio"
 * - "Hey Siri, play pop music on MegaRadio"
 * - "Hey Siri, play classical music"
 * - "Hey Siri, play rock radio"
 * 
 * Controls (via MediaSession):
 * - "Hey Siri, pause"
 * - "Hey Siri, skip"
 * - "Hey Siri, next station"
 * - "Hey Siri, stop"
 * 
 * INFO.PLIST REQUIREMENTS:
 * 
 * <key>NSUserActivityTypes</key>
 * <array>
 *     <string>INPlayMediaIntent</string>
 *     <string>com.visiongo.megaradio.playMedia</string>
 * </array>
 * 
 * CAPABILITIES REQUIRED:
 * - Siri
 * - Background Modes: Audio, AirPlay, and Picture in Picture
 */
