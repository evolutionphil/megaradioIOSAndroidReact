// CarPlaySceneDelegate.swift
// Full-featured CarPlay scene delegate for MegaRadio

import UIKit
import CarPlay
import Intents

@available(iOS 14.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate, CPSearchTemplateDelegate {
    
    var interfaceController: CPInterfaceController?
    var carWindow: CPWindow?
    
    // MARK: - Template Storage
    private var tabBarTemplate: CPTabBarTemplate?
    private var searchTemplate: CPSearchTemplate?
    
    // MARK: - Image Cache (Memory Efficient)
    private static let imageCache = NSCache<NSString, UIImage>()
    
    // MARK: - CPTemplateApplicationSceneDelegate
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlay] Connected to CarPlay")
        self.interfaceController = interfaceController
        self.carWindow = window
        
        // Configure image cache limits
        CarPlaySceneDelegate.imageCache.countLimit = 50
        CarPlaySceneDelegate.imageCache.totalCostLimit = 50 * 1024 * 1024 // 50MB
        
        // Create Tab Bar with multiple sections
        setupTabBarTemplate()
        
        // Setup notification observers for React Native communication
        setupNotificationObservers()
        
        // Post notification for React Native to handle
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidConnect"), object: nil)
    }
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController,
        from window: CPWindow
    ) {
        print("[CarPlay] Disconnected from CarPlay")
        
        // Cleanup
        removeNotificationObservers()
        CarPlaySceneDelegate.imageCache.removeAllObjects()
        
        self.interfaceController = nil
        self.carWindow = nil
        self.tabBarTemplate = nil
        self.searchTemplate = nil
        
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidDisconnect"), object: nil)
    }
    
    // MARK: - Notification Observers
    
    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleFavoritesUpdate),
            name: NSNotification.Name("CarPlayFavoritesUpdated"),
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRecentUpdate),
            name: NSNotification.Name("CarPlayRecentUpdated"),
            object: nil
        )
    }
    
    private func removeNotificationObservers() {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func handleFavoritesUpdate() {
        // Refresh favorites tab when data changes
        DispatchQueue.main.async { [weak self] in
            self?.refreshFavoritesTab()
        }
    }
    
    @objc private func handleRecentUpdate() {
        // Refresh recent tab when data changes
        DispatchQueue.main.async { [weak self] in
            self?.refreshRecentTab()
        }
    }
    
    // MARK: - Setup Tab Bar
    
    private func setupTabBarTemplate() {
        // 1. Now Playing Tab (with custom buttons)
        let nowPlayingTemplate = CPNowPlayingTemplate.shared
        nowPlayingTemplate.tabTitle = "Şu An"
        nowPlayingTemplate.tabImage = UIImage(systemName: "play.circle.fill")
        
        // Add favorite button to Now Playing
        if #available(iOS 15.0, *) {
            let favoriteButton = CPNowPlayingImageButton(image: UIImage(systemName: "heart")!) { [weak self] _ in
                self?.toggleCurrentStationFavorite()
            }
            nowPlayingTemplate.updateNowPlayingButtons([favoriteButton])
        }
        
        // 2. Search Tab
        searchTemplate = CPSearchTemplate()
        searchTemplate?.delegate = self
        searchTemplate?.tabTitle = "Ara"
        searchTemplate?.tabImage = UIImage(systemName: "magnifyingglass")
        
        // 3. Favorites Tab
        let favoritesTemplate = createFavoritesTemplate()
        
        // 4. Genres Tab
        let genresTemplate = createGenresTemplate()
        
        // 5. Recent Tab
        let recentTemplate = createRecentTemplate()
        
        // 6. Popular/Recommended Tab
        let popularTemplate = createPopularTemplate()
        
        // Create Tab Bar (max 5 tabs for CarPlay)
        let tabBar = CPTabBarTemplate(templates: [
            nowPlayingTemplate,
            searchTemplate!,
            favoritesTemplate,
            genresTemplate,
            recentTemplate
        ])
        
        self.tabBarTemplate = tabBar
        
        interfaceController?.setRootTemplate(tabBar, animated: true) { [weak self] success, error in
            if let error = error {
                print("[CarPlay] Error setting root template: \(error)")
            } else {
                print("[CarPlay] Tab bar template set successfully")
            }
        }
    }
    
    // MARK: - CPSearchTemplateDelegate
    
    func searchTemplate(_ searchTemplate: CPSearchTemplate, updatedSearchText searchText: String, completionHandler: @escaping ([CPListItem]) -> Void) {
        // Search stations based on text
        searchStations(query: searchText) { [weak self] stations in
            var items: [CPListItem] = []
            
            for station in stations.prefix(12) { // Limit results for performance
                let item = CPListItem(
                    text: station.name,
                    detailText: station.genre ?? "Radio"
                )
                
                // Load cached image or fetch
                self?.loadCachedImage(from: station.logoURL) { image in
                    DispatchQueue.main.async {
                        item.setImage(image ?? UIImage(systemName: "radio"))
                    }
                }
                
                item.handler = { [weak self] _, completion in
                    self?.playStation(station)
                    completion()
                }
                
                items.append(item)
            }
            
            completionHandler(items)
        }
    }
    
    func searchTemplateSearchButtonPressed(_ searchTemplate: CPSearchTemplate) {
        // Handle search button press
        print("[CarPlay] Search button pressed")
    }
    
    func searchTemplate(_ searchTemplate: CPSearchTemplate, selectedResult item: CPListItem, completionHandler: @escaping () -> Void) {
        // Handle when user selects a search result
        print("[CarPlay] Search result selected: \(item.text ?? "unknown")")
        
        // The item.handler should already handle playback, but we call completion
        completionHandler()
    }
    
    // MARK: - Favorites Template
    
    private func createFavoritesTemplate() -> CPListTemplate {
        let favorites = loadFavorites()
        var items: [CPListItem] = []
        
        for station in favorites {
            let item = CPListItem(
                text: station.name,
                detailText: station.genre ?? "Radio"
            )
            
            loadCachedImage(from: station.logoURL) { [weak item] image in
                DispatchQueue.main.async {
                    item?.setImage(image ?? UIImage(systemName: "heart.fill"))
                }
            }
            
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            let placeholder = CPListItem(
                text: "Favori istasyon yok",
                detailText: "Uygulamadan favori ekleyin"
            )
            placeholder.setImage(UIImage(systemName: "heart"))
            items.append(placeholder)
        }
        
        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Favoriler", sections: [section])
        template.tabTitle = "Favoriler"
        template.tabImage = UIImage(systemName: "heart.fill")
        
        return template
    }
    
    private func refreshFavoritesTab() {
        guard let tabBar = tabBarTemplate else { return }
        
        let newFavoritesTemplate = createFavoritesTemplate()
        
        // Find and replace favorites tab
        var templates = tabBar.templates
        if let index = templates.firstIndex(where: { ($0 as? CPListTemplate)?.tabTitle == "Favoriler" }) {
            templates[index] = newFavoritesTemplate
            tabBar.updateTemplates(templates)
        }
    }
    
    // MARK: - Genres Template
    
    private func createGenresTemplate() -> CPListTemplate {
        let genres = loadGenres()
        var items: [CPListItem] = []
        
        let iconMap: [String: String] = [
            "pop": "music.note",
            "rock": "guitars",
            "jazz": "music.quarternote.3",
            "classical": "music.note.list",
            "electronic": "waveform",
            "hiphop": "music.mic",
            "turkish": "star.fill",
            "news": "newspaper",
            "talk": "person.wave.2",
            "sports": "sportscourt",
            "country": "leaf",
            "rnb": "heart.circle",
            "dance": "figure.dance",
            "ambient": "cloud",
            "metal": "flame",
            "reggae": "sun.max",
            "latin": "guitars.fill",
            "world": "globe",
            "religious": "book.closed",
            "kids": "face.smiling"
        ]
        
        for genre in genres {
            let item = CPListItem(text: genre.name, detailText: "\(genre.stationCount ?? 0) istasyon")
            let icon = iconMap[genre.id.lowercased()] ?? "radio"
            item.setImage(UIImage(systemName: icon))
            
            item.handler = { [weak self] _, completion in
                self?.showGenreStations(genreId: genre.id, name: genre.name)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            // Default genres if none loaded from API
            let defaultGenres = [
                ("Pop", "music.note", "pop"),
                ("Rock", "guitars", "rock"),
                ("Jazz", "music.quarternote.3", "jazz"),
                ("Klasik", "music.note.list", "classical"),
                ("Elektronik", "waveform", "electronic"),
                ("Hip Hop", "music.mic", "hiphop"),
                ("Türkçe", "star.fill", "turkish"),
                ("Haberler", "newspaper", "news"),
                ("Spor", "sportscourt", "sports"),
                ("Talk", "person.wave.2", "talk"),
                ("Country", "leaf", "country"),
                ("R&B", "heart.circle", "rnb"),
                ("Dance", "figure.dance", "dance"),
                ("Ambient", "cloud", "ambient"),
                ("Metal", "flame", "metal"),
                ("Reggae", "sun.max", "reggae"),
                ("Latin", "guitars.fill", "latin"),
                ("World", "globe", "world")
            ]
            
            for (name, icon, genreId) in defaultGenres {
                let item = CPListItem(text: name, detailText: nil)
                item.setImage(UIImage(systemName: icon))
                
                item.handler = { [weak self] _, completion in
                    self?.showGenreStations(genreId: genreId, name: name)
                    completion()
                }
                
                items.append(item)
            }
        }
        
        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Türler", sections: [section])
        template.tabTitle = "Türler"
        template.tabImage = UIImage(systemName: "square.grid.2x2.fill")
        
        return template
    }
    
    // MARK: - Recent Template
    
    private func createRecentTemplate() -> CPListTemplate {
        let recentStations = loadRecentStations()
        var items: [CPListItem] = []
        
        for station in recentStations {
            let item = CPListItem(
                text: station.name,
                detailText: station.genre ?? "Radio"
            )
            
            loadCachedImage(from: station.logoURL) { [weak item] image in
                DispatchQueue.main.async {
                    item?.setImage(image ?? UIImage(systemName: "clock"))
                }
            }
            
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            let placeholder = CPListItem(
                text: "Henüz radyo dinlemediniz",
                detailText: "Dinlemeye başlayın"
            )
            placeholder.setImage(UIImage(systemName: "clock"))
            items.append(placeholder)
        }
        
        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Son Dinlenen", sections: [section])
        template.tabTitle = "Son"
        template.tabImage = UIImage(systemName: "clock.fill")
        
        return template
    }
    
    private func refreshRecentTab() {
        guard let tabBar = tabBarTemplate else { return }
        
        let newRecentTemplate = createRecentTemplate()
        
        var templates = tabBar.templates
        if let index = templates.firstIndex(where: { ($0 as? CPListTemplate)?.tabTitle == "Son" }) {
            templates[index] = newRecentTemplate
            tabBar.updateTemplates(templates)
        }
    }
    
    // MARK: - Popular Template
    
    private func createPopularTemplate() -> CPListTemplate {
        let popularStations = loadPopularStations()
        var items: [CPListItem] = []
        
        for station in popularStations {
            let item = CPListItem(
                text: station.name,
                detailText: station.genre ?? "Popüler"
            )
            
            loadCachedImage(from: station.logoURL) { [weak item] image in
                DispatchQueue.main.async {
                    item?.setImage(image ?? UIImage(systemName: "star"))
                }
            }
            
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            let placeholder = CPListItem(
                text: "Popüler istasyonlar yükleniyor...",
                detailText: nil
            )
            placeholder.setImage(UIImage(systemName: "star"))
            items.append(placeholder)
        }
        
        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Popüler", sections: [section])
        template.tabTitle = "Popüler"
        template.tabImage = UIImage(systemName: "star.fill")
        
        return template
    }
    
    // MARK: - Genre Stations
    
    private func showGenreStations(genreId: String, name: String) {
        let loadingItem = CPListItem(text: "Yükleniyor...", detailText: nil)
        loadingItem.setImage(UIImage(systemName: "arrow.clockwise"))
        
        let section = CPListSection(items: [loadingItem])
        let template = CPListTemplate(title: name, sections: [section])
        
        interfaceController?.pushTemplate(template, animated: true) { [weak self] _, _ in
            self?.loadGenreStationsFromAPI(genreId: genreId) { stations in
                DispatchQueue.main.async {
                    self?.updateGenreTemplate(template, with: stations)
                }
            }
        }
    }
    
    private func loadGenreStationsFromAPI(genreId: String, completion: @escaping ([Station]) -> Void) {
        // Load from UserDefaults cache or request via NotificationCenter
        let key = "carplay_genre_\(genreId)"
        if let data = UserDefaults.standard.data(forKey: key),
           let stations = try? JSONDecoder().decode([Station].self, from: data) {
            completion(stations)
        } else {
            // Request data from React Native
            NotificationCenter.default.post(
                name: NSNotification.Name("CarPlayRequestGenreStations"),
                object: nil,
                userInfo: ["genreId": genreId]
            )
            // Return empty for now, will be updated when data arrives
            completion([])
        }
    }
    
    private func updateGenreTemplate(_ template: CPListTemplate, with stations: [Station]) {
        var items: [CPListItem] = []
        
        for station in stations {
            let item = CPListItem(text: station.name, detailText: station.genre)
            
            loadCachedImage(from: station.logoURL) { [weak item] image in
                DispatchQueue.main.async {
                    item?.setImage(image ?? UIImage(systemName: "radio"))
                }
            }
            
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            let placeholder = CPListItem(text: "İstasyon bulunamadı", detailText: nil)
            placeholder.setImage(UIImage(systemName: "exclamationmark.circle"))
            items.append(placeholder)
        }
        
        template.updateSections([CPListSection(items: items)])
    }
    
    // MARK: - Search
    
    private func searchStations(query: String, completion: @escaping ([Station]) -> Void) {
        guard !query.isEmpty else {
            completion([])
            return
        }
        
        // Search in cached stations first
        let allStations = loadAllCachedStations()
        let filtered = allStations.filter { station in
            station.name.localizedCaseInsensitiveContains(query) ||
            (station.genre?.localizedCaseInsensitiveContains(query) ?? false)
        }
        
        completion(Array(filtered.prefix(12)))
        
        // Also request from React Native for server search
        NotificationCenter.default.post(
            name: NSNotification.Name("CarPlaySearchStations"),
            object: nil,
            userInfo: ["query": query]
        )
    }
    
    private func loadAllCachedStations() -> [Station] {
        var allStations: [Station] = []
        
        allStations.append(contentsOf: loadFavorites())
        allStations.append(contentsOf: loadRecentStations())
        allStations.append(contentsOf: loadPopularStations())
        
        // Remove duplicates
        var seen = Set<String>()
        return allStations.filter { station in
            if seen.contains(station.id) {
                return false
            }
            seen.insert(station.id)
            return true
        }
    }
    
    // MARK: - Station Playback
    
    private func playStation(_ station: Station) {
        print("[CarPlay] Playing station: \(station.name)")
        
        // Send to React Native via NotificationCenter
        NotificationCenter.default.post(
            name: NSNotification.Name("CarPlayPlayStation"),
            object: nil,
            userInfo: [
                "stationId": station.id,
                "stationName": station.name,
                "streamURL": station.streamURL ?? "",
                "logoURL": station.logoURL ?? "",
                "genre": station.genre ?? ""
            ]
        )
        
        // Navigate to Now Playing
        if let tabBar = tabBarTemplate {
            tabBar.selectTemplate(at: 0) // Now Playing is first tab
        }
    }
    
    private func toggleCurrentStationFavorite() {
        // Tell React Native to toggle favorite for current station
        NotificationCenter.default.post(
            name: NSNotification.Name("CarPlayToggleFavorite"),
            object: nil
        )
    }
    
    // MARK: - Data Loading
    
    private func loadFavorites() -> [Station] {
        // Works for both logged-in users AND guest users
        if let data = UserDefaults.standard.data(forKey: "carplay_favorites"),
           let stations = try? JSONDecoder().decode([Station].self, from: data) {
            return stations
        }
        
        // Try alternative key for guest users
        if let guestData = UserDefaults.standard.data(forKey: "guest_favorites"),
           let guestStations = try? JSONDecoder().decode([Station].self, from: guestData) {
            return guestStations
        }
        
        return []
    }
    
    private func loadRecentStations() -> [Station] {
        if let data = UserDefaults.standard.data(forKey: "carplay_recent"),
           let stations = try? JSONDecoder().decode([Station].self, from: data) {
            return stations
        }
        return []
    }
    
    private func loadGenres() -> [Genre] {
        if let data = UserDefaults.standard.data(forKey: "carplay_genres"),
           let genres = try? JSONDecoder().decode([Genre].self, from: data) {
            return genres
        }
        return []
    }
    
    private func loadPopularStations() -> [Station] {
        if let data = UserDefaults.standard.data(forKey: "carplay_popular"),
           let stations = try? JSONDecoder().decode([Station].self, from: data) {
            return stations
        }
        return []
    }
    
    // MARK: - Image Loading with Cache
    
    private func loadCachedImage(from urlString: String?, completion: @escaping (UIImage?) -> Void) {
        guard let urlString = urlString, let url = URL(string: urlString) else {
            completion(nil)
            return
        }
        
        let cacheKey = urlString as NSString
        
        // Check cache first
        if let cachedImage = CarPlaySceneDelegate.imageCache.object(forKey: cacheKey) {
            completion(cachedImage)
            return
        }
        
        // Fetch from network
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data, let image = UIImage(data: data) else {
                completion(nil)
                return
            }
            
            // Cache the image
            CarPlaySceneDelegate.imageCache.setObject(image, forKey: cacheKey)
            
            completion(image)
        }.resume()
    }
}

// MARK: - Station Model

struct Station: Codable {
    let id: String
    let name: String
    let genre: String?
    let logoURL: String?
    let streamURL: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case genre
        case logoURL = "logo_url"
        case streamURL = "stream_url"
    }
}

// MARK: - Genre Model

struct Genre: Codable {
    let id: String
    let name: String
    let stationCount: Int?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case stationCount = "station_count"
    }
}

// MARK: - Dashboard Support (iOS 15+)

@available(iOS 15.0, *)
extension CarPlaySceneDelegate: CPTemplateApplicationDashboardSceneDelegate {
    
    func templateApplicationDashboardScene(
        _ templateApplicationDashboardScene: CPTemplateApplicationDashboardScene,
        didConnect dashboardController: CPDashboardController,
        to window: UIWindow
    ) {
        print("[CarPlay] Dashboard connected")
        
        // Create dashboard buttons for quick access
        let playButton = CPDashboardButton(
            titleVariants: ["Çal", "▶️"],
            subtitleVariants: ["MegaRadio"],
            image: UIImage(systemName: "play.fill")!
        ) { [weak self] _ in
            // Resume playback
            NotificationCenter.default.post(name: NSNotification.Name("CarPlayResumePlayback"), object: nil)
        }
        
        let favoritesButton = CPDashboardButton(
            titleVariants: ["Favoriler", "❤️"],
            subtitleVariants: [""],
            image: UIImage(systemName: "heart.fill")!
        ) { [weak self] _ in
            // Open favorites
            NotificationCenter.default.post(name: NSNotification.Name("CarPlayOpenFavorites"), object: nil)
        }
        
        dashboardController.shortcutButtons = [playButton, favoritesButton]
    }
    
    func templateApplicationDashboardScene(
        _ templateApplicationDashboardScene: CPTemplateApplicationDashboardScene,
        didDisconnect dashboardController: CPDashboardController,
        from window: UIWindow
    ) {
        print("[CarPlay] Dashboard disconnected")
    }
}
