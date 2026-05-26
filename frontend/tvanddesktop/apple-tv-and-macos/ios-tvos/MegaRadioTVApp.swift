// MegaRadioTVApp.swift — Apple TV entry point.
//
// • Mounts the SwiftUI scene at native 1920×1080.
// • Injects shared singletons (AudioPlayer / AuthStore / FavoritesStore / Router)
//   at the root so every child view — including `NowPlayingBar` rendered inside
//   `.overlay` modifiers and any `NavigationStack` destinations — can read them
//   safely via `@EnvironmentObject`.

import SwiftUI
import AVFoundation

#if os(tvOS)

@main
struct MegaRadioTVApp: App {

    // Singletons. Owned at App scope so they survive screen changes.
    @StateObject private var router    = TVRouter()
    @StateObject private var player    = AudioPlayer.shared
    @StateObject private var auth      = AuthStore.shared
    @StateObject private var favorites = FavoritesStore.shared
    @StateObject private var country   = CountryStore.shared

    init() {
        configureAudioSession()
    }

    var body: some Scene {
        WindowGroup {
            RootRouterView()
                .environmentObject(router)
                .environmentObject(player)
                .environmentObject(auth)
                .environmentObject(favorites)
                .environmentObject(country)
                .preferredColorScheme(.dark)
        }
    }

    /// Set up the global audio session for live-stream radio playback.
    /// On tvOS this enables background audio + AirPlay routing.
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.allowAirPlay]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            NSLog("[MegaRadioTV] AVAudioSession setup failed: \(error)")
        }
    }
}

#endif // os(tvOS)
