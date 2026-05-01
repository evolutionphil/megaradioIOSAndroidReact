// MegaRadio tvOS — Siri Intents Extension
//
// Lets users say "Hey Siri, play jazz on MegaRadio" / "Hey Siri, play Radio
// Paradise on MegaRadio". Apple routes the phrase to INPlayMediaIntent and
// we resolve it against the MegaRadio catalog.
//
// Xcode setup:
//   1. File → New → Target → tvOS → **Intents Extension**
//   2. Bundle suffix `.intents`  — it is started in the background by SiriKit
//   3. Info.plist → NSExtension → NSExtensionAttributes → IntentsSupported:
//        INPlayMediaIntent
//   4. Enable capability "Siri" on the main app target
//   5. Add NSUserActivityTypes to the main app's Info.plist:
//        INPlayMediaIntent
//   6. Mark the app as a Music media app in Info.plist:
//        INAlternativeAppNames → [ "MegaRadio", "Mega Radio" ]

import Intents

final class IntentHandler: INExtension, INPlayMediaIntentHandling {

    override func handler(for intent: INIntent) -> Any { self }

    // MARK: - INPlayMediaIntent resolution

    func resolveMediaItems(for intent: INPlayMediaIntent,
                           with completion: @escaping ([INPlayMediaMediaItemResolutionResult]) -> Void) {
        guard let search = intent.mediaSearch else {
            completion([.unsupported(forReason: .unsupportedMediaType)]); return
        }
        Task {
            let items = await resolveSearch(search)
            if items.isEmpty {
                completion([.unsupported(forReason: .unsupportedMediaType)])
            } else {
                completion([INPlayMediaMediaItemResolutionResult.successes(with: items)].flatMap { $0 })
            }
        }
    }

    func handle(intent: INPlayMediaIntent,
                completion: @escaping (INPlayMediaIntentResponse) -> Void) {
        let userActivity = NSUserActivity(activityType: "com.visiongo.megaradio.play")
        userActivity.addUserInfoEntries(from: [
            "stationId": intent.mediaItems?.first?.identifier ?? "",
            "title":     intent.mediaItems?.first?.title ?? "",
        ])
        let response = INPlayMediaIntentResponse(code: .handleInApp, userActivity: userActivity)
        completion(response)
    }

    // MARK: - Catalog lookup

    private func resolveSearch(_ search: INMediaSearch) async -> [INMediaItem] {
        let term = (search.mediaName ?? search.genreNames?.first ?? "").trimmingCharacters(in: .whitespaces)
        guard !term.isEmpty,
              let url = URL(string: "https://api.themegaradio.com/api/stations?search=\(term.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? term)&limit=5") else {
            return []
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            struct Station: Decodable { let id: String; let name: String; let favicon: String? }
            let list = (try? JSONDecoder().decode([Station].self, from: data)) ?? []
            return list.map { st in
                INMediaItem(identifier: st.id,
                            title: st.name,
                            type: .musicStation,
                            artwork: st.favicon.flatMap(INImage.init(url:)) ?? nil,
                            artist: "MegaRadio")
            }
        } catch {
            return []
        }
    }
}

private extension INImage {
    convenience init?(url: String) {
        guard let u = URL(string: url) else { return nil }
        self.init(url: u)
    }
}
