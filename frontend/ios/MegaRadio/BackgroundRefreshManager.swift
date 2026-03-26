import Foundation
import BackgroundTasks
import UIKit

/**
 * BackgroundRefreshManager - iOS Background App Refresh for MegaRadio
 * 
 * This class handles:
 * 1. BGAppRefreshTask registration and scheduling
 * 2. Periodic cache updates when app is in background
 * 3. Integration with CarPlayCacheManager for cold-start readiness
 * 
 * Key iOS Background Modes Required:
 * - Background fetch
 * - Background processing
 * 
 * Info.plist keys:
 * - UIBackgroundModes: ["fetch", "processing"]
 * - BGTaskSchedulerPermittedIdentifiers: ["com.visiongo.megaradio.refresh"]
 */
class BackgroundRefreshManager {
    
    static let shared = BackgroundRefreshManager()
    
    // MARK: - Constants
    
    /// Task identifier - must match Info.plist BGTaskSchedulerPermittedIdentifiers
    static let refreshTaskIdentifier = "com.visiongo.megaradio.refresh"
    static let processingTaskIdentifier = "com.visiongo.megaradio.processing"
    
    /// Minimum interval between refresh attempts (15 minutes)
    /// Note: iOS controls actual timing based on usage patterns
    private let minimumRefreshInterval: TimeInterval = 15 * 60
    
    /// API Configuration
    private let apiKey = "mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw"
    private let baseURL = "https://themegaradio.com"
    
    /// Logging
    private let logPrefix = "[BackgroundRefresh]"
    
    private init() {
        print("\(logPrefix) Manager initialized")
    }
    
    // MARK: - Task Registration
    
    /**
     * Register background tasks with the system
     * MUST be called in AppDelegate's didFinishLaunchingWithOptions BEFORE app finishes launching
     */
    func registerBackgroundTasks() {
        print("\(logPrefix) Registering background tasks...")
        
        // Register App Refresh Task (for quick data fetches)
        let refreshRegistered = BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.refreshTaskIdentifier,
            using: nil
        ) { [weak self] task in
            self?.handleAppRefreshTask(task as! BGAppRefreshTask)
        }
        
        if refreshRegistered {
            print("\(logPrefix) ✅ App Refresh task registered: \(Self.refreshTaskIdentifier)")
        } else {
            print("\(logPrefix) ❌ Failed to register App Refresh task")
        }
        
        // Register Processing Task (for longer operations)
        let processingRegistered = BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.processingTaskIdentifier,
            using: nil
        ) { [weak self] task in
            self?.handleProcessingTask(task as! BGProcessingTask)
        }
        
        if processingRegistered {
            print("\(logPrefix) ✅ Processing task registered: \(Self.processingTaskIdentifier)")
        } else {
            print("\(logPrefix) ❌ Failed to register Processing task")
        }
    }
    
    // MARK: - Task Scheduling
    
    /**
     * Schedule the next app refresh task
     * Call this when app enters background or after completing a refresh
     */
    func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: Self.refreshTaskIdentifier)
        
        // Request earliest execution 15 minutes from now
        // Note: iOS decides actual timing based on device usage patterns
        request.earliestBeginDate = Date(timeIntervalSinceNow: minimumRefreshInterval)
        
        do {
            try BGTaskScheduler.shared.submit(request)
            print("\(logPrefix) ✅ App Refresh scheduled for ~15 minutes from now")
            
            // Log to remote for debugging
            sendRemoteLog(level: "info", message: "Background refresh scheduled", data: [
                "earliestDate": ISO8601DateFormatter().string(from: request.earliestBeginDate ?? Date()),
                "taskId": Self.refreshTaskIdentifier
            ])
        } catch BGTaskScheduler.Error.notPermitted {
            print("\(logPrefix) ❌ Background refresh not permitted (check Settings > Background App Refresh)")
        } catch BGTaskScheduler.Error.tooManyPendingTaskRequests {
            print("\(logPrefix) ⚠️ Too many pending tasks - skipping")
        } catch BGTaskScheduler.Error.unavailable {
            print("\(logPrefix) ❌ Background tasks unavailable on this device")
        } catch {
            print("\(logPrefix) ❌ Failed to schedule: \(error.localizedDescription)")
        }
    }
    
    /**
     * Schedule a longer processing task (for more intensive updates)
     * Call this when app enters background
     */
    func scheduleProcessingTask() {
        let request = BGProcessingTaskRequest(identifier: Self.processingTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60) // 1 hour
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false // Don't require charging
        
        do {
            try BGTaskScheduler.shared.submit(request)
            print("\(logPrefix) ✅ Processing task scheduled")
        } catch {
            print("\(logPrefix) ❌ Failed to schedule processing task: \(error)")
        }
    }
    
    // MARK: - Task Handlers
    
    /**
     * Handle BGAppRefreshTask execution
     * Called by system when it's time to refresh (max ~30 seconds)
     */
    private func handleAppRefreshTask(_ task: BGAppRefreshTask) {
        print("\(logPrefix) 🔄 App Refresh task starting...")
        
        sendRemoteLog(level: "info", message: "Background refresh started", data: [
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ])
        
        // Schedule next refresh before doing any work
        scheduleAppRefresh()
        
        // Create a work item for the refresh
        let refreshWorkItem = DispatchWorkItem { [weak self] in
            self?.performCacheRefresh { success in
                task.setTaskCompleted(success: success)
                print("\(self?.logPrefix ?? "") Task completed: \(success ? "✅" : "❌")")
            }
        }
        
        // Set expiration handler
        task.expirationHandler = {
            print("\(self.logPrefix) ⚠️ Task expired - cancelling")
            refreshWorkItem.cancel()
            task.setTaskCompleted(success: false)
        }
        
        // Execute the work
        DispatchQueue.global(qos: .background).async(execute: refreshWorkItem)
    }
    
    /**
     * Handle BGProcessingTask execution
     * For longer background operations (several minutes)
     */
    private func handleProcessingTask(_ task: BGProcessingTask) {
        print("\(logPrefix) 🔄 Processing task starting...")
        
        // Schedule next processing task
        scheduleProcessingTask()
        
        let processingWorkItem = DispatchWorkItem { [weak self] in
            self?.performFullCacheUpdate { success in
                task.setTaskCompleted(success: success)
                print("\(self?.logPrefix ?? "") Processing task completed: \(success ? "✅" : "❌")")
            }
        }
        
        task.expirationHandler = {
            print("\(self.logPrefix) ⚠️ Processing task expired")
            processingWorkItem.cancel()
            task.setTaskCompleted(success: false)
        }
        
        DispatchQueue.global(qos: .background).async(execute: processingWorkItem)
    }
    
    // MARK: - Cache Refresh Logic
    
    /**
     * Perform quick cache refresh (for BGAppRefreshTask)
     * Must complete within ~30 seconds
     */
    private func performCacheRefresh(completion: @escaping (Bool) -> Void) {
        print("\(logPrefix) Performing cache refresh...")
        
        let group = DispatchGroup()
        var overallSuccess = true
        
        // Fetch popular stations
        group.enter()
        fetchPopularStations { success in
            if !success { overallSuccess = false }
            group.leave()
        }
        
        // Fetch genres
        group.enter()
        fetchGenres { success in
            if !success { overallSuccess = false }
            group.leave()
        }
        
        group.notify(queue: .main) { [weak self] in
            print("\(self?.logPrefix ?? "") Cache refresh completed: \(overallSuccess ? "✅" : "⚠️ partial")")
            
            self?.sendRemoteLog(level: overallSuccess ? "info" : "warn", message: "Background refresh completed", data: [
                "success": overallSuccess,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ])
            
            completion(overallSuccess)
        }
    }
    
    /**
     * Perform full cache update (for BGProcessingTask)
     * Can take longer, includes more data
     */
    private func performFullCacheUpdate(completion: @escaping (Bool) -> Void) {
        print("\(logPrefix) Performing full cache update...")
        
        let group = DispatchGroup()
        var overallSuccess = true
        
        // Fetch popular stations (more data)
        group.enter()
        fetchPopularStations(limit: 100) { success in
            if !success { overallSuccess = false }
            group.leave()
        }
        
        // Fetch genres
        group.enter()
        fetchGenres(limit: 50) { success in
            if !success { overallSuccess = false }
            group.leave()
        }
        
        // Fetch favorites if user is logged in
        group.enter()
        fetchUserFavorites { success in
            // Don't fail if user isn't logged in
            group.leave()
        }
        
        group.notify(queue: .main) {
            print("\(self.logPrefix) Full cache update completed")
            completion(overallSuccess)
        }
    }
    
    // MARK: - API Calls
    
    private func fetchPopularStations(limit: Int = 50, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/stations/popular?limit=\(limit)&tv=1") else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.timeoutInterval = 25 // Leave buffer for task timeout
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil,
                  let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                print("\(self.logPrefix) ❌ Failed to fetch popular stations: \(error?.localizedDescription ?? "unknown")")
                completion(false)
                return
            }
            
            do {
                if let stations = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    CarPlayCacheManager.shared.saveStations(stations, forKey: "popular")
                    print("\(self.logPrefix) ✅ Cached \(stations.count) popular stations")
                    completion(true)
                } else if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                          let stations = json["stations"] as? [[String: Any]] {
                    CarPlayCacheManager.shared.saveStations(stations, forKey: "popular")
                    print("\(self.logPrefix) ✅ Cached \(stations.count) popular stations")
                    completion(true)
                } else {
                    completion(false)
                }
            } catch {
                print("\(self.logPrefix) ❌ JSON parsing error: \(error)")
                completion(false)
            }
        }.resume()
    }
    
    private func fetchGenres(limit: Int = 40, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/genres/precomputed?tv=1&limit=\(limit)") else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.timeoutInterval = 25
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion(false)
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let genres = json["data"] as? [[String: Any]] {
                    CarPlayCacheManager.shared.saveGenres(genres)
                    print("\(self.logPrefix) ✅ Cached \(genres.count) genres")
                    completion(true)
                } else {
                    completion(false)
                }
            } catch {
                completion(false)
            }
        }.resume()
    }
    
    private func fetchUserFavorites(completion: @escaping (Bool) -> Void) {
        // Check if we have a stored auth token
        guard let token = UserDefaults.standard.string(forKey: "megaradio_auth_token") else {
            print("\(logPrefix) No auth token - skipping favorites")
            completion(true) // Not a failure, just skip
            return
        }
        
        guard let url = URL(string: "\(baseURL)/api/user/favorites") else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 25
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion(false)
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let favorites = json["favorites"] as? [[String: Any]] {
                    CarPlayCacheManager.shared.saveStations(favorites, forKey: "favorites")
                    print("\(self.logPrefix) ✅ Cached \(favorites.count) favorites")
                    completion(true)
                } else {
                    completion(true) // Not necessarily a failure
                }
            } catch {
                completion(false)
            }
        }.resume()
    }
    
    // MARK: - Remote Logging
    
    private func sendRemoteLog(level: String, message: String, data: [String: Any]? = nil) {
        #if DEBUG
        print("\(logPrefix) [\(level.uppercased())] \(message) \(data ?? [:])")
        #endif
        
        // Send to remote logging service if available
        guard let url = URL(string: "\(baseURL)/api/logs/carplay") else { return }
        
        var logData: [String: Any] = [
            "level": level,
            "message": message,
            "source": "BackgroundRefreshManager",
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
    
    // MARK: - Status & Debug
    
    /**
     * Get background refresh status for debugging
     */
    func getStatus() -> [String: Any] {
        return [
            "refreshTaskId": Self.refreshTaskIdentifier,
            "processingTaskId": Self.processingTaskIdentifier,
            "minimumInterval": minimumRefreshInterval,
            "backgroundRefreshStatus": UIApplication.shared.backgroundRefreshStatus.rawValue,
            "isBackgroundRefreshEnabled": UIApplication.shared.backgroundRefreshStatus == .available
        ]
    }
    
    /**
     * Check if background refresh is available and enabled
     */
    var isBackgroundRefreshAvailable: Bool {
        return UIApplication.shared.backgroundRefreshStatus == .available
    }
    
    /**
     * Cancel all pending background tasks (for debugging/testing)
     */
    func cancelAllPendingTasks() {
        BGTaskScheduler.shared.cancelAllTaskRequests()
        print("\(logPrefix) All pending tasks cancelled")
    }
}

// MARK: - Debug Helpers (for Xcode testing)

#if DEBUG
extension BackgroundRefreshManager {
    /**
     * Manually trigger a background refresh (for testing)
     * Use this in Debug > Simulate Background Fetch in Xcode
     */
    func simulateBackgroundRefresh(completion: @escaping (UIBackgroundFetchResult) -> Void) {
        print("\(logPrefix) 🧪 Simulating background refresh...")
        
        performCacheRefresh { success in
            completion(success ? .newData : .failed)
        }
    }
}
#endif
