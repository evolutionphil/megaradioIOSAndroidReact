// SiriPlayMediaHandler.swift
//
// Converts an `INPlayMediaIntent` user-activity (the kind Siri / "Hey Siri,
// play Rock Antenne on MegaRadio" produces) into a `megaradio://play?q=...`
// deep link URL.
//
// The actual station resolution + audio start happens in JavaScript (see
// `src/services/carPlayService.ts` and the React Native `Linking` handler),
// so we only need to extract the search term here.
//
// Why a deep link instead of doing the work in Swift?
//   - The station catalog lives behind the backend API which is talked to
//     from JS anyway. Re-implementing search in Swift would duplicate state
//     (favorites, region, recent) and force us to ship a 2nd auth header.
//   - CarPlay's "Now Playing" template is already rendered from JS via
//     react-native-carplay; piping a single string into the existing search
//     pipeline reuses that rendering for free.

import Foundation
import Intents

@objc public final class SiriPlayMediaHandler: NSObject {

    /// Returns a `megaradio://play?q=...` URL if the user-activity is a Siri
    /// media playback intent we can handle, otherwise nil.
    @objc public static func deepLinkURL(for userActivity: NSUserActivity) -> URL? {
        // 1) Modern path: Siri ships an INInteraction whose intent is
        //    INPlayMediaIntent (preferred — has structured media search).
        if let interaction = userActivity.interaction,
           let intent = interaction.intent as? INPlayMediaIntent {
            if let url = url(fromIntent: intent) { return url }
        }

        // 2) Fallback for activities created via SiriKit shortcut donation
        //    or custom user-activity types declared in Info.plist
        //    (`com.visiongo.megaradio.playMedia`).
        if userActivity.activityType == "INPlayMediaIntent"
            || userActivity.activityType == "com.visiongo.megaradio.playMedia" {
            if let query = userActivity.userInfo?["query"] as? String,
               !query.isEmpty {
                return makeUrl(query: query)
            }
            if let title = userActivity.title, !title.isEmpty {
                return makeUrl(query: title)
            }
        }
        return nil
    }

    private static func url(fromIntent intent: INPlayMediaIntent) -> URL? {
        // Prefer the explicit "mediaName" out of the search criteria;
        // fall back to the first mediaItem title.
        if let name = intent.mediaSearch?.mediaName, !name.isEmpty {
            return makeUrl(query: name)
        }
        if let item = intent.mediaItems?.first,
           let title = item.title, !title.isEmpty {
            return makeUrl(query: title)
        }
        // Genre / artist queries — useful for "Play some jazz on MegaRadio".
        if let genre = intent.mediaSearch?.genreNames?.first, !genre.isEmpty {
            return makeUrl(query: genre)
        }
        if let artist = intent.mediaSearch?.artistName, !artist.isEmpty {
            return makeUrl(query: artist)
        }
        return nil
    }

    private static func makeUrl(query: String) -> URL? {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        guard let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            return nil
        }
        return URL(string: "megaradio://play?q=\(encoded)")
    }
}
