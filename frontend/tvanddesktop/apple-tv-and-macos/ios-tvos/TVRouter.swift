// TVRouter.swift — wouter-style hash router clone for SwiftUI tvOS.
//
// Mirrors the routes declared in `web-preview/src/App.tsx`:
//
//   /            → Splash       (auto-routes to /guide-1 or /discover-no-user)
//   /guide-1..4  → Guide1..4    (onboarding overlays)
//   /discover-no-user → DiscoverPage (main home)
//   /radio-playing → RadioPlayingPage
//   /genres        → GenresPage
//   /genre-list/:tag → GenreListPage
//   /search        → SearchPage
//   /favorites     → FavoritesPage
//   /country-select → CountrySelectPage
//   /settings      → SettingsPage
//   /login         → LoginPage  (QR pairing)
//
// We use an ObservableObject so any view can call
// `router.go("/genres")` and the root re-renders.

import Foundation
import Combine

enum Route: Equatable, Hashable {
    case splash
    case guide(Int)            // 1...4
    case discover
    case radioPlaying
    case genres
    case genreList(String)
    case search
    case favorites
    case countrySelect
    case settings
    case login
}

@MainActor
final class TVRouter: ObservableObject {
    @Published private(set) var route: Route = .splash
    /// Stack of previous routes for "back" navigation.
    @Published private(set) var stack: [Route] = []

    func go(_ next: Route) {
        guard next != route else { return }
        stack.append(route)
        route = next
    }

    func replace(_ next: Route) {
        route = next
    }

    func back() {
        guard let prev = stack.popLast() else { return }
        route = prev
    }
}
