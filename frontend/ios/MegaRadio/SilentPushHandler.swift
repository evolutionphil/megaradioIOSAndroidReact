import Foundation
import UIKit
import UserNotifications

/**
 * SilentPushHandler - iOS Silent Push Notification Handler
 * 
 * Handles silent push notifications (content-available: 1) from server
 * to trigger background cache updates for CarPlay/Android Auto.
 * 
 * Server Payload Format:
 * {
 *   "aps": {
 *     "content-available": 1,
 *     "priority": "5"
 *   },
 *   "action": "cache_refresh",
 *   "country": "Turkey",
 *   "timestamp": "2025-12-15T10:00:00Z"
 * }
 * 
 * Supported Actions:
 * - cache_refresh: Full cache refresh
 * - popular_update: Only update popular stations
 * - genres_update: Only update genres
 * - favorites_sync: Sync user favorites
 * 
 * Requirements:
 * - Enable "Remote notifications" in Background Modes
 * - Enable "Push Notifications" capability
 * - Register for remote notifications in AppDelegate
 */
class SilentPushHandler {
    
    static let shared = SilentPushHandler()
    
    private let logPrefix = "[SilentPush]"
    private let apiKey = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"
    private let baseURL = "https://themegaradio.com"
    
    private init() {
        print("\(logPrefix) Handler initialized")
    }
    
    // MARK: - Main Handler
    
    /**
     * Handle incoming silent push notification
     * Called from AppDelegate's didReceiveRemoteNotification
     * 
     * - Parameter userInfo: Push payload
     * - Parameter completion: Must be called with fetch result
     */
    func handleSilentPush(
        userInfo: [AnyHashable: Any],
        completion: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("\(logPrefix) Received push notification")
        
        // Verify this is a silent push (content-available: 1)
        guard let aps = userInfo["aps"] as? [String: Any],
              let contentAvailable = aps["content-available"] as? Int,
              contentAvailable == 1 else {
            print("\(logPrefix) Not a silent push - ignoring")
            completion(.noData)
            return
        }
        
        // Log to remote server
        sendRemoteLog(level: "info", message: "Silent push received", data: userInfo)
        
        // Extract action from payload
        let action = userInfo["action"] as? String ?? "cache_refresh"
        let country = userInfo["country"] as? String
        
        print("\(logPrefix) Processing action: \(action), country: \(country ?? "global")")
        
        // Handle based on action type
        switch action {
        case "cache_refresh":
            performFullCacheRefresh(country: country, completion: completion)
            
        case "popular_update":
            updatePopularStations(country: country, completion: completion)
            
        case "genres_update":
            updateGenres(country: country, completion: completion)
            
        case "favorites_sync":
            syncFavorites(completion: completion)
            
        case "clear_cache":
            clearCache(completion: completion)
            
        default:
            print("\(logPrefix) Unknown action: \(action) - performing default refresh")
            performFullCacheRefresh(country: country, completion: completion)
        }
    }
    
    // MARK: - Cache Actions
    
    /**
     * Perform full cache refresh (popular + genres)
     */
    private func performFullCacheRefresh(
        country: String?,
        completion: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("\(logPrefix) Starting full cache refresh...")
        
        let group = DispatchGroup()
        var success = true
        
        // Update popular stations
        group.enter()
        CarPlayCacheManager.shared.fetchPopularStationsNatively(country: country) { stations in
            if stations.isEmpty {
                success = false
                print("\(self.logPrefix) ⚠️ Popular stations fetch returned empty")
            } else {
                print("\(self.logPrefix) ✅ Cached \(stations.count) popular stations")
            }
            group.leave()
        }
        
        // Update genres
        group.enter()
        CarPlayCacheManager.shared.fetchGenresNatively(country: country) { genres in
            if genres.isEmpty {
                success = false
                print("\(self.logPrefix) ⚠️ Genres fetch returned empty")
            } else {
                print("\(self.logPrefix) ✅ Cached \(genres.count) genres")
            }
            group.leave()
        }
        
        group.notify(queue: .main) { [weak self] in
            let result: UIBackgroundFetchResult = success ? .newData : .failed
            print("\(self?.logPrefix ?? "") Cache refresh completed: \(success ? "✅" : "⚠️")")
            
            self?.sendRemoteLog(level: success ? "info" : "warn", message: "Silent push cache refresh completed", data: [
                "success": success,
                "action": "cache_refresh"
            ])
            
            completion(result)
        }
    }
    
    /**
     * Update only popular stations
     */
    private func updatePopularStations(
        country: String?,
        completion: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("\(logPrefix) Updating popular stations...")
        
        CarPlayCacheManager.shared.fetchPopularStationsNatively(country: country, limit: 100) { [weak self] stations in
            let success = !stations.isEmpty
            print("\(self?.logPrefix ?? "") Popular stations update: \(success ? "✅ \(stations.count) stations" : "❌ failed")")
            completion(success ? .newData : .failed)
        }
    }
    
    /**
     * Update only genres
     */
    private func updateGenres(
        country: String?,
        completion: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("\(logPrefix) Updating genres...")
        
        CarPlayCacheManager.shared.fetchGenresNatively(country: country, limit: 50) { [weak self] genres in
            let success = !genres.isEmpty
            print("\(self?.logPrefix ?? "") Genres update: \(success ? "✅ \(genres.count) genres" : "❌ failed")")
            completion(success ? .newData : .failed)
        }
    }
    
    /**
     * Sync user favorites from server
     */
    private func syncFavorites(completion: @escaping (UIBackgroundFetchResult) -> Void) {
        print("\(logPrefix) Syncing favorites...")
        
        // Check if user is logged in
        guard let token = UserDefaults.standard.string(forKey: "megaradio_auth_token") else {
            print("\(logPrefix) No auth token - skipping favorites sync")
            completion(.noData)
            return
        }
        
        guard let url = URL(string: "\(baseURL)/api/user/favorites") else {
            completion(.failed)
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 25
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let data = data, error == nil else {
                print("\(self?.logPrefix ?? "") Favorites sync failed: \(error?.localizedDescription ?? "unknown")")
                completion(.failed)
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let favorites = json["favorites"] as? [[String: Any]] {
                    CarPlayCacheManager.shared.saveStations(favorites, forKey: "favorites")
                    print("\(self?.logPrefix ?? "") ✅ Synced \(favorites.count) favorites")
                    completion(.newData)
                } else {
                    completion(.noData)
                }
            } catch {
                print("\(self?.logPrefix ?? "") Favorites parsing error: \(error)")
                completion(.failed)
            }
        }.resume()
    }
    
    /**
     * Clear all cached data (for debugging/forced refresh)
     */
    private func clearCache(completion: @escaping (UIBackgroundFetchResult) -> Void) {
        print("\(logPrefix) Clearing cache...")
        CarPlayCacheManager.shared.clearCache()
        completion(.newData)
    }
    
    // MARK: - Remote Logging
    
    private func sendRemoteLog(level: String, message: String, data: Any? = nil) {
        #if DEBUG
        print("\(logPrefix) [\(level.uppercased())] \(message)")
        #endif
        
        guard let url = URL(string: "\(baseURL)/api/logs/carplay") else { return }
        
        var logData: [String: Any] = [
            "level": level,
            "message": message,
            "source": "SilentPushHandler",
            "platform": "iOS",
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        
        if let data = data {
            logData["data"] = data
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.httpBody = try? JSONSerialization.data(withJSONObject: logData)
        
        URLSession.shared.dataTask(with: request).resume()
    }
    
    // MARK: - Push Registration Helpers
    
    /**
     * Register for remote notifications
     * Call this from AppDelegate didFinishLaunchingWithOptions
     */
    static func registerForRemoteNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
            print("[SilentPush] Registered for remote notifications")
        }
    }
    
    /**
     * Handle device token registration
     */
    static func didRegisterForRemoteNotifications(deviceToken: Data) {
        let tokenParts = deviceToken.map { String(format: "%02.2hhx", $0) }
        let token = tokenParts.joined()
        print("[SilentPush] Device token: \(token)")
        
        // Store token for later use
        UserDefaults.standard.set(token, forKey: "megaradio_device_token")
        
        // TODO: Send token to your backend server
        // This would typically be done via an API call
    }
    
    /**
     * Handle registration failure
     */
    static func didFailToRegisterForRemoteNotifications(error: Error) {
        print("[SilentPush] ❌ Failed to register: \(error.localizedDescription)")
    }
}

// MARK: - Server-Side Payload Examples

/*
 * SILENT PUSH PAYLOAD EXAMPLES (Send from your backend)
 * 
 * 1. Full Cache Refresh:
 * {
 *   "aps": {
 *     "content-available": 1,
 *     "priority": "5"
 *   },
 *   "action": "cache_refresh",
 *   "country": "Turkey"
 * }
 * 
 * 2. Popular Stations Update:
 * {
 *   "aps": {
 *     "content-available": 1,
 *     "priority": "5"
 *   },
 *   "action": "popular_update",
 *   "country": "Germany"
 * }
 * 
 * 3. Favorites Sync:
 * {
 *   "aps": {
 *     "content-available": 1,
 *     "priority": "5"
 *   },
 *   "action": "favorites_sync"
 * }
 * 
 * 4. Clear Cache (Force Refresh):
 * {
 *   "aps": {
 *     "content-available": 1,
 *     "priority": "5"
 *   },
 *   "action": "clear_cache"
 * }
 * 
 * APNs HTTP/2 Headers:
 * - apns-push-type: background
 * - apns-priority: 5
 * - apns-topic: com.visiongo.megaradio
 */
