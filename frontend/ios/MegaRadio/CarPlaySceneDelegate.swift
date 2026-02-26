// CarPlaySceneDelegate.swift
// CarPlay scene delegate for MegaRadio

import UIKit
import CarPlay

@available(iOS 14.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    var interfaceController: CPInterfaceController?
    var carWindow: CPWindow?
    
    // MARK: - Template Storage
    private var tabBarTemplate: CPTabBarTemplate?
    
    // MARK: - CPTemplateApplicationSceneDelegate
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlay] Connected to CarPlay")
        self.interfaceController = interfaceController
        self.carWindow = window
        
        // Create Tab Bar with multiple sections
        setupTabBarTemplate()
        
        // Post notification for React Native to handle
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidConnect"), object: nil)
    }
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController,
        from window: CPWindow
    ) {
        print("[CarPlay] Disconnected from CarPlay")
        self.interfaceController = nil
        self.carWindow = nil
        self.tabBarTemplate = nil
        
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidDisconnect"), object: nil)
    }
    
    // MARK: - Setup Tab Bar
    
    private func setupTabBarTemplate() {
        // 1. Now Playing Tab
        let nowPlayingTemplate = CPNowPlayingTemplate.shared
        nowPlayingTemplate.tabTitle = "Şu An"
        nowPlayingTemplate.tabImage = UIImage(systemName: "play.circle.fill")
        
        // 2. Favorites Tab
        let favoritesTemplate = createFavoritesTemplate()
        
        // 3. Genres Tab
        let genresTemplate = createGenresTemplate()
        
        // 4. Recent Tab
        let recentTemplate = createRecentTemplate()
        
        // Create Tab Bar
        let tabBar = CPTabBarTemplate(templates: [
            nowPlayingTemplate,
            favoritesTemplate,
            genresTemplate,
            recentTemplate
        ])
        
        self.tabBarTemplate = tabBar
        
        interfaceController?.setRootTemplate(tabBar, animated: true) { success, error in
            if let error = error {
                print("[CarPlay] Error setting root template: \(error)")
            } else {
                print("[CarPlay] Tab bar template set successfully")
            }
        }
    }
    
    // MARK: - Favorites Template
    
    private func createFavoritesTemplate() -> CPListTemplate {
        // Load favorites from UserDefaults/AsyncStorage
        let favorites = loadFavorites()
        
        var items: [CPListItem] = []
        
        for station in favorites {
            let item = CPListItem(
                text: station.name,
                detailText: station.genre ?? "Radio"
            )
            
            // Set station artwork if available
            if let logoURL = station.logoURL, let url = URL(string: logoURL) {
                loadImage(from: url) { image in
                    item.setImage(image)
                }
            } else {
                item.setImage(UIImage(systemName: "radio"))
            }
            
            // Handle station selection
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        // If no favorites, show placeholder
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
    
    // MARK: - Genres Template
    
    private func createGenresTemplate() -> CPListTemplate {
        // Load all genres from UserDefaults (synced from API)
        let genres = loadGenres()
        
        var items: [CPListItem] = []
        
        // Genre icon mapping
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
        
        // If no genres loaded, show defaults
        if items.isEmpty {
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
            
            if let logoURL = station.logoURL, let url = URL(string: logoURL) {
                loadImage(from: url) { image in
                    item.setImage(image)
                }
            } else {
                item.setImage(UIImage(systemName: "clock"))
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
    
    // MARK: - Genre Stations
    
    private func showGenreStations(genreId: String, name: String) {
        // This would load stations for the genre from API
        // For now, show a loading template
        let loadingItem = CPListItem(text: "Yükleniyor...", detailText: nil)
        loadingItem.setImage(UIImage(systemName: "arrow.clockwise"))
        
        let section = CPListSection(items: [loadingItem])
        let template = CPListTemplate(title: name, sections: [section])
        
        interfaceController?.pushTemplate(template, animated: true) { _, _ in
            // Load actual stations from API
            self.loadGenreStations(genreId: genreId) { stations in
                DispatchQueue.main.async {
                    self.updateGenreTemplate(template, with: stations)
                }
            }
        }
    }
    
    private func loadGenreStations(genreId: String, completion: @escaping ([Station]) -> Void) {
        // TODO: Load from API via NotificationCenter or shared data
        // For now return empty - React Native will handle this
        completion([])
    }
    
    private func updateGenreTemplate(_ template: CPListTemplate, with stations: [Station]) {
        var items: [CPListItem] = []
        
        for station in stations {
            let item = CPListItem(text: station.name, detailText: station.genre)
            item.setImage(UIImage(systemName: "radio"))
            
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            let placeholder = CPListItem(text: "İstasyon bulunamadı", detailText: nil)
            items.append(placeholder)
        }
        
        template.updateSections([CPListSection(items: items)])
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
                "streamURL": station.streamURL ?? ""
            ]
        )
        
        // Navigate to Now Playing
        if let tabBar = tabBarTemplate {
            tabBar.selectTemplate(at: 0) // Now Playing is first tab
        }
    }
    
    // MARK: - Data Loading
    
    private func loadFavorites() -> [Station] {
        // Load from UserDefaults (synced from AsyncStorage)
        guard let data = UserDefaults.standard.data(forKey: "carplay_favorites"),
              let stations = try? JSONDecoder().decode([Station].self, from: data) else {
            return []
        }
        return stations
    }
    
    private func loadRecentStations() -> [Station] {
        guard let data = UserDefaults.standard.data(forKey: "carplay_recent"),
              let stations = try? JSONDecoder().decode([Station].self, from: data) else {
            return []
        }
        return stations
    }
    
    // MARK: - Image Loading
    
    private func loadImage(from url: URL, completion: @escaping (UIImage?) -> Void) {
        URLSession.shared.dataTask(with: url) { data, _, _ in
            if let data = data, let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    completion(image)
                }
            } else {
                DispatchQueue.main.async {
                    completion(UIImage(systemName: "radio"))
                }
            }
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
