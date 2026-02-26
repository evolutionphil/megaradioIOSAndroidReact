// CarPlaySceneDelegate.swift
// Simple CarPlay scene delegate for MegaRadio - Audio App

import UIKit
import CarPlay

@available(iOS 14.0, *)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    
    var interfaceController: CPInterfaceController?
    var carWindow: CPWindow?
    
    // MARK: - CPTemplateApplicationSceneDelegate
    
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController,
        to window: CPWindow
    ) {
        print("[CarPlay] Connected to CarPlay")
        self.interfaceController = interfaceController
        self.carWindow = window
        
        // Setup tab bar with templates
        setupTabBarTemplate()
        
        // Notify React Native
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
        
        NotificationCenter.default.post(name: NSNotification.Name("CarPlayDidDisconnect"), object: nil)
    }
    
    // MARK: - Setup Tab Bar
    
    private func setupTabBarTemplate() {
        // 1. Now Playing Tab (default for audio apps)
        let nowPlayingTemplate = CPNowPlayingTemplate.shared
        
        // 2. Favorites Tab
        let favoritesTemplate = createFavoritesTemplate()
        
        // 3. Genres Tab
        let genresTemplate = createGenresTemplate()
        
        // 4. Recent Tab
        let recentTemplate = createRecentTemplate()
        
        // Create Tab Bar (max 4 templates for stability)
        let tabBar = CPTabBarTemplate(templates: [
            nowPlayingTemplate,
            favoritesTemplate,
            genresTemplate,
            recentTemplate
        ])
        
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
        let favorites = loadFavorites()
        var items: [CPListItem] = []
        
        for station in favorites.prefix(12) {
            let item = CPListItem(
                text: station.name,
                detailText: station.genre ?? "Radio"
            )
            item.setImage(UIImage(systemName: "heart.fill"))
            
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            let placeholder = CPListItem(text: "Favori istasyon yok", detailText: "Uygulamadan ekleyin")
            placeholder.setImage(UIImage(systemName: "heart"))
            items.append(placeholder)
        }
        
        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Favoriler", sections: [section])
        template.tabImage = UIImage(systemName: "heart.fill")
        
        return template
    }
    
    // MARK: - Genres Template
    
    private func createGenresTemplate() -> CPListTemplate {
        let genres = [
            ("Pop", "music.note"),
            ("Rock", "guitars"),
            ("Jazz", "music.quarternote.3"),
            ("Klasik", "music.note.list"),
            ("Türkçe", "star.fill"),
            ("Haberler", "newspaper"),
            ("Spor", "sportscourt"),
            ("Talk", "person.wave.2")
        ]
        
        var items: [CPListItem] = []
        
        for (name, icon) in genres {
            let item = CPListItem(text: name, detailText: nil)
            item.setImage(UIImage(systemName: icon))
            
            item.handler = { [weak self] _, completion in
                self?.loadGenreStations(genreName: name)
                completion()
            }
            
            items.append(item)
        }
        
        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Türler", sections: [section])
        template.tabImage = UIImage(systemName: "square.grid.2x2.fill")
        
        return template
    }
    
    // MARK: - Recent Template
    
    private func createRecentTemplate() -> CPListTemplate {
        let recentStations = loadRecentStations()
        var items: [CPListItem] = []
        
        for station in recentStations.prefix(12) {
            let item = CPListItem(
                text: station.name,
                detailText: station.genre ?? "Radio"
            )
            item.setImage(UIImage(systemName: "clock"))
            
            item.handler = { [weak self] _, completion in
                self?.playStation(station)
                completion()
            }
            
            items.append(item)
        }
        
        if items.isEmpty {
            let placeholder = CPListItem(text: "Henüz radyo dinlemediniz", detailText: nil)
            placeholder.setImage(UIImage(systemName: "clock"))
            items.append(placeholder)
        }
        
        let section = CPListSection(items: items)
        let template = CPListTemplate(title: "Son Dinlenen", sections: [section])
        template.tabImage = UIImage(systemName: "clock.fill")
        
        return template
    }
    
    // MARK: - Load Genre Stations
    
    private func loadGenreStations(genreName: String) {
        // Request genre stations from React Native
        NotificationCenter.default.post(
            name: NSNotification.Name("CarPlayRequestGenreStations"),
            object: nil,
            userInfo: ["genreName": genreName]
        )
    }
    
    // MARK: - Station Playback
    
    private func playStation(_ station: Station) {
        print("[CarPlay] Playing station: \(station.name)")
        
        NotificationCenter.default.post(
            name: NSNotification.Name("CarPlayPlayStation"),
            object: nil,
            userInfo: [
                "stationId": station.id,
                "stationName": station.name,
                "streamURL": station.streamURL ?? "",
                "logoURL": station.logoURL ?? ""
            ]
        )
    }
    
    // MARK: - Data Loading from UserDefaults
    
    private func loadFavorites() -> [Station] {
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
