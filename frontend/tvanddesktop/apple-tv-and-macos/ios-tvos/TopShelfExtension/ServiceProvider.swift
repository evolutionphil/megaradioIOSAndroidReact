// MegaRadio tvOS — Top Shelf Extension
//
// Displays the user's "Continue Listening" stations in the top-shelf area of
// the tvOS home screen (the large animated region above app icons on focus).
//
// Xcode setup:
//   1. File → New → Target → tvOS → **TV Top Shelf Extension**
//   2. Bundle suffix `.topshelf` (must be under the main app bundle id)
//   3. Replace the template `ServiceProvider.swift` with this file
//   4. Embed in the main MegaRadio app target
//
// Data feed: the main app writes the last 5 stations into the shared App
// Group container (`group.com.visiongo.megaradio`) whenever playback changes.
// The extension reads them here — no network calls needed.

import TVServices
import Foundation

final class ServiceProvider: NSObject, TVTopShelfProvider {

    var topShelfStyle: TVTopShelfContentStyle { .sectioned }

    var topShelfItems: [TVContentItem] {
        let ident = TVContentIdentifier(identifier: "continue-listening",
                                        container: TVContentIdentifier(identifier: "root", container: nil)!)!
        let section = TVContentItem(contentIdentifier: ident)!
        section.title = "Continue Listening"
        section.topShelfItems = recentStations().compactMap(makeItem)
        return [section]
    }

    // MARK: - Persisted recent list (App Group)
    private struct Recent: Codable {
        let id: String
        let name: String
        let genre: String?
        let streamUrl: String
        let iconUrl: String
    }

    private func recentStations() -> [Recent] {
        guard let defaults = UserDefaults(suiteName: "group.com.visiongo.megaradio"),
              let data = defaults.data(forKey: "continue_listening_v1"),
              let list = try? JSONDecoder().decode([Recent].self, from: data) else {
            return []
        }
        return Array(list.prefix(5))
    }

    private func makeItem(_ r: Recent) -> TVContentItem? {
        let id = TVContentIdentifier(identifier: "station-\(r.id)", container: nil)!
        let item = TVContentItem(contentIdentifier: id)
        item?.title = r.name
        item?.imageShape = .square
        if let url = URL(string: r.iconUrl) { item?.imageURL = url }
        // Deep-link back into the app; handle in `application(_:open:)`
        item?.displayURL = URL(string: "megaradio://play?station=\(r.id)")
        item?.playURL    = URL(string: "megaradio://play?station=\(r.id)")
        return item
    }
}
