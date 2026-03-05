import Foundation

/**
 * CarPlayCacheManager - Native Swift Cache for Cold Start Support
 * 
 * This class provides:
 * 1. UserDefaults-based persistent cache for station/genre data
 * 2. Native HTTP client for direct API calls (no JS bridge needed)
 * 3. Instant data access on cold start (< 100ms)
 * 
 * The cache is populated by:
 * - React Native when JS bridge is ready (via CarPlayCacheModule)
 * - Native HTTP fallback when JS is not available
 */
class CarPlayCacheManager {
    
    static let shared = CarPlayCacheManager()
    
    private let defaults = UserDefaults.standard
    private let cachePrefix = "megaradio_carplay_"
    private let apiKey = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"
    private let baseURL = "https://themegaradio.com"
    private let cacheMaxAge: TimeInterval = 7 * 24 * 3600 // 7 days
    
    private init() {
        print("[CarPlayCacheManager] Initialized - Native cache ready for cold start")
    }
    
    // MARK: - Station Cache
    
    /**
     * Save stations to UserDefaults (native persistent storage)
     * Called from React Native after successful API fetch
     */
    func saveStations(_ stations: [[String: Any]], forKey key: String) {
        do {
            let data = try JSONSerialization.data(withJSONObject: stations)
            defaults.set(data, forKey: "\(cachePrefix)\(key)")
            defaults.set(Date(), forKey: "\(cachePrefix)\(key)_timestamp")
            print("[CarPlayCacheManager] Saved \(stations.count) stations for key: \(key)")
        } catch {
            print("[CarPlayCacheManager] Error saving stations: \(error)")
        }
    }
    
    /**
     * Load cached stations (instant on cold start - no network)
     * Returns nil if cache is empty or expired
     */
    func loadStations(forKey key: String, maxAge: TimeInterval? = nil) -> [[String: Any]]? {
        let effectiveMaxAge = maxAge ?? cacheMaxAge
        
        guard let timestamp = defaults.object(forKey: "\(cachePrefix)\(key)_timestamp") as? Date else {
            print("[CarPlayCacheManager] No timestamp for key: \(key)")
            return nil
        }
        
        guard Date().timeIntervalSince(timestamp) < effectiveMaxAge else {
            print("[CarPlayCacheManager] Cache expired for key: \(key)")
            return nil
        }
        
        guard let data = defaults.data(forKey: "\(cachePrefix)\(key)"),
              let stations = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            print("[CarPlayCacheManager] No cached data for key: \(key)")
            return nil
        }
        
        print("[CarPlayCacheManager] Loaded \(stations.count) stations from cache for key: \(key)")
        return stations
    }
    
    /**
     * Load stations with stale fallback (returns expired cache if available)
     * Better UX - show something even if cache is old
     */
    func loadStationsWithStaleFallback(forKey key: String) -> [[String: Any]]? {
        // Try fresh cache first
        if let fresh = loadStations(forKey: key) {
            return fresh
        }
        
        // Fallback to stale cache (ignore expiry)
        guard let data = defaults.data(forKey: "\(cachePrefix)\(key)"),
              let stations = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            return nil
        }
        
        print("[CarPlayCacheManager] Using STALE cache for key: \(key) (expired but available)")
        return stations
    }
    
    // MARK: - Genre Cache
    
    func saveGenres(_ genres: [[String: Any]], forKey key: String = "genres") {
        do {
            let data = try JSONSerialization.data(withJSONObject: genres)
            defaults.set(data, forKey: "\(cachePrefix)\(key)")
            defaults.set(Date(), forKey: "\(cachePrefix)\(key)_timestamp")
            print("[CarPlayCacheManager] Saved \(genres.count) genres")
        } catch {
            print("[CarPlayCacheManager] Error saving genres: \(error)")
        }
    }
    
    func loadGenres(forKey key: String = "genres") -> [[String: Any]]? {
        return loadStations(forKey: key)
    }
    
    // MARK: - Native HTTP Client (Fallback when JS not ready)
    
    /**
     * Fetch popular stations directly via native HTTP (no JS bridge)
     * Use this as fallback when CarPlay connects before JS is ready
     */
    func fetchPopularStationsNatively(country: String? = nil, limit: Int = 50, completion: @escaping ([[String: Any]]) -> Void) {
        var urlString = "\(baseURL)/api/stations/popular?limit=\(limit)&tv=1"
        if let country = country, !country.isEmpty {
            if let encoded = country.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
                urlString += "&country=\(encoded)"
            }
        }
        
        guard let url = URL(string: urlString) else {
            print("[CarPlayCacheManager] Invalid URL: \(urlString)")
            completion([])
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10
        
        print("[CarPlayCacheManager] Native fetch: \(urlString)")
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                print("[CarPlayCacheManager] Native fetch error: \(error.localizedDescription)")
                completion([])
                return
            }
            
            guard let data = data else {
                print("[CarPlayCacheManager] No data received")
                completion([])
                return
            }
            
            do {
                // API returns array directly or {stations: [...]}
                if let stationsArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    print("[CarPlayCacheManager] Fetched \(stationsArray.count) stations (array format)")
                    self?.saveStations(stationsArray, forKey: "popular")
                    completion(stationsArray)
                } else if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let stations = json["stations"] as? [[String: Any]] {
                    print("[CarPlayCacheManager] Fetched \(stations.count) stations (object format)")
                    self?.saveStations(stations, forKey: "popular")
                    completion(stations)
                } else {
                    print("[CarPlayCacheManager] Unexpected response format")
                    completion([])
                }
            } catch {
                print("[CarPlayCacheManager] JSON parsing error: \(error)")
                completion([])
            }
        }.resume()
    }
    
    /**
     * Fetch genres directly via native HTTP
     */
    func fetchGenresNatively(country: String? = nil, limit: Int = 40, completion: @escaping ([[String: Any]]) -> Void) {
        var urlString = "\(baseURL)/api/genres/precomputed?tv=1&limit=\(limit)"
        if let country = country, !country.isEmpty {
            if let encoded = country.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
                urlString += "&country=\(encoded)"
            }
        }
        
        guard let url = URL(string: urlString) else {
            completion([])
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.timeoutInterval = 10
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let data = data, error == nil else {
                completion([])
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let genres = json["data"] as? [[String: Any]] {
                    self?.saveGenres(genres)
                    completion(genres)
                } else if let genres = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    self?.saveGenres(genres)
                    completion(genres)
                } else {
                    completion([])
                }
            } catch {
                completion([])
            }
        }.resume()
    }
    
    // MARK: - Cache Management
    
    /**
     * Check if we have cached data ready for cold start
     */
    func hasCachedData() -> Bool {
        return loadStationsWithStaleFallback(forKey: "popular") != nil
    }
    
    /**
     * Clear all cached data
     */
    func clearCache() {
        let keys = defaults.dictionaryRepresentation().keys.filter { $0.hasPrefix(cachePrefix) }
        keys.forEach { defaults.removeObject(forKey: $0) }
        print("[CarPlayCacheManager] Cache cleared - \(keys.count) keys removed")
    }
    
    /**
     * Get cache statistics for debugging
     */
    func getCacheStats() -> [String: Any] {
        let keys = defaults.dictionaryRepresentation().keys.filter { $0.hasPrefix(cachePrefix) && !$0.contains("_timestamp") }
        var stats: [String: Any] = [
            "keyCount": keys.count,
            "keys": keys.map { String($0.dropFirst(cachePrefix.count)) }
        ]
        
        // Check popular stations cache
        if let popularTimestamp = defaults.object(forKey: "\(cachePrefix)popular_timestamp") as? Date {
            let age = Date().timeIntervalSince(popularTimestamp)
            stats["popularCacheAge"] = Int(age / 3600) // hours
            stats["popularCacheExpired"] = age > cacheMaxAge
        }
        
        return stats
    }
    
    // MARK: - Prefetch for Cold Start Optimization
    
    /**
     * Prefetch all data needed for CarPlay cold start
     * Call this when app launches or enters background
     */
    func prefetchForColdStart(country: String? = nil) {
        print("[CarPlayCacheManager] Prefetching data for cold start...")
        
        let group = DispatchGroup()
        
        group.enter()
        fetchPopularStationsNatively(country: country) { _ in
            group.leave()
        }
        
        group.enter()
        fetchGenresNatively(country: country) { _ in
            group.leave()
        }
        
        group.notify(queue: .main) {
            print("[CarPlayCacheManager] Prefetch complete - ready for cold start")
        }
    }
}
