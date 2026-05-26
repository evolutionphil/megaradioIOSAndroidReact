// FavoritesStore.swift — Local + remote favorite station persistence.

import Foundation
import Combine

@MainActor
final class FavoritesStore: ObservableObject {
    static let shared = FavoritesStore()

    @Published private(set) var ids: Set<String> = []
    @Published private(set) var stations: [Station] = []

    private let key = "megaradio.tv.favorites"

    private init() {
        if let data = UserDefaults.standard.data(forKey: key),
           let saved = try? JSONDecoder().decode([Station].self, from: data) {
            stations = saved
            ids = Set(saved.map { $0.id })
        }
    }

    func toggle(_ station: Station) {
        if ids.contains(station.id) {
            ids.remove(station.id)
            stations.removeAll { $0.id == station.id }
        } else {
            ids.insert(station.id)
            stations.insert(station, at: 0)
        }
        persist()
    }

    func isFavorite(_ station: Station) -> Bool { ids.contains(station.id) }

    private func persist() {
        if let data = try? JSONEncoder().encode(stations) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
