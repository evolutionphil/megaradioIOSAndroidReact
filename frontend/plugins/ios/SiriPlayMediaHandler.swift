import Foundation
import Intents

@objc public final class SiriPlayMediaHandler: NSObject {
    @objc public static func deepLinkURL(for activity: NSUserActivity) -> URL? {
        if let intent = activity.interaction?.intent as? INPlayMediaIntent {
            let queries = [intent.mediaSearch?.mediaName, intent.mediaItems?.first?.title,
                           intent.mediaSearch?.genreNames?.first, intent.mediaSearch?.artistName]
            for query in queries {
                if let query = query, let url = makeURL(query) { return url }
            }
        }
        if activity.activityType == "INPlayMediaIntent"
            || activity.activityType == "com.visiongo.megaradio.playMedia" {
            if let query = activity.userInfo?["query"] as? String, let url = makeURL(query) {
                return url
            }
            if let title = activity.title { return makeURL(title) }
        }
        return nil
    }

    private static func makeURL(_ query: String) -> URL? {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return nil }
        var url = URLComponents()
        url.scheme = "megaradio"
        url.host = "play"
        url.queryItems = [URLQueryItem(name: "q", value: query)]
        return url.url
    }
}