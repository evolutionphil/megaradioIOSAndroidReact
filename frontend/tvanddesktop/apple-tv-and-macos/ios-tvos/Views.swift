// Views.swift — Root router + shared components for MegaRadio TV.
//
// Each major page from `web-preview/src/pages/*.tsx` has been ported to its
// own Swift file (Splash.swift, Guides.swift, Discover.swift, RadioPlaying.swift,
// Genres.swift, Search.swift, Favorites.swift, Settings.swift, CountrySelect.swift)
// so this file stays focused on the router + shared widgets.

import SwiftUI

// ────────────────────────────────────────────────────────────────────
// Root — chooses which page to render based on TVRouter state.
// ────────────────────────────────────────────────────────────────────

struct RootRouterView: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var player: AudioPlayer

    var body: some View {
        ZStack {
            // Page switcher — `.id(...)` forces SwiftUI to rebuild on route change
            // so each page's `.task` runs cleanly.
            currentPage
                .id(routeID)
                .transition(.opacity)

            // Persistent global player overlay (matches web `GlobalPlayer`).
            if let _ = player.currentStation, !shouldHideGlobalPlayer {
                GlobalPlayerView()
                    .allowsHitTesting(true)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: router.route)
    }

    /// Hide the floating player on screens that present their OWN player UI.
    private var shouldHideGlobalPlayer: Bool {
        switch router.route {
        case .radioPlaying, .splash, .guide:
            return true
        default:
            return false
        }
    }

    @ViewBuilder private var currentPage: some View {
        switch router.route {
        case .splash:                SplashPage()
        case .guide(let n):          GuidePage(step: n)
        case .discover:              DiscoverPage()
        case .radioPlaying:          RadioPlayingPage()
        case .genres:                GenresPage()
        case .genreList(let tag):    GenreListPage(tag: tag)
        case .search:                SearchPage()
        case .favorites:             FavoritesPage()
        case .countrySelect:         CountrySelectPage()
        case .settings:              SettingsPage()
        case .login:                 LoginPage()
        }
    }

    private var routeID: String {
        switch router.route {
        case .splash:                return "splash"
        case .guide(let n):          return "guide-\(n)"
        case .discover:              return "discover"
        case .radioPlaying:          return "radio-playing"
        case .genres:                return "genres"
        case .genreList(let t):      return "genre-list-\(t)"
        case .search:                return "search"
        case .favorites:             return "favorites"
        case .countrySelect:         return "country-select"
        case .settings:              return "settings"
        case .login:                 return "login"
        }
    }
}

// ────────────────────────────────────────────────────────────────────
// Shared widgets ported from web-preview
// ────────────────────────────────────────────────────────────────────

/// MegaRadio wordmark + pink path-8 swoosh.
/// Web: top-left `(30, 64)` with size `164.421 × 57` on the discover page,
/// and centered `(798, 484)` with size `323.069 × 112` on the splash.
struct MegaRadioLogo: View {
    /// Visual scale relative to the splash-size logo (323×112).
    /// `0.508` produces the 164×57 header version used on every main page.
    let scale: CGFloat

    init(scale: CGFloat = 1.0) { self.scale = scale }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Pink swoosh on the left (web: `images/path-8.svg`, occupies
            // `right-[65.2%]` of the wrapper, i.e. left 34.8% of width).
            BrandImage(name: "path-8")
                .frame(width: 323.069 * 0.348 * scale, height: 112 * scale)

            // Wordmark on the right (web: `left-[18.67%]`, `top-[46.16%]`,
            // font 53.108px Ubuntu — "mega" Bold, "radio" Regular).
            HStack(spacing: 0) {
                Text("mega").font(.ubuntu(53.108 * scale, .bold))
                Text("radio").font(.ubuntu(53.108 * scale, .regular))
            }
            .foregroundColor(.white)
            .offset(x: 323.069 * 0.1867 * scale, y: 112 * 0.4616 * scale)
        }
        .frame(width: 323.069 * scale, height: 112 * scale, alignment: .topLeading)
    }
}

/// Left vertical navigation sidebar.
/// Web: fixed at `left:48, top:170, width:120, height:760`.
struct AppSidebar: View {
    let active: Route
    @EnvironmentObject var router: TVRouter
    @FocusState private var focused: String?

    private struct Item {
        let id: String
        let label: String
        let icon: String
        let route: Route
    }

    private let items: [Item] = [
        .init(id: "discover",  label: "Discover",  icon: "radio-icon",    route: .discover),
        .init(id: "genres",    label: "Genres",    icon: "music-icon",    route: .genres),
        .init(id: "search",    label: "Search",    icon: "search-icon",   route: .search),
        .init(id: "favorites", label: "Favorites", icon: "heart-icon",    route: .favorites),
        .init(id: "country",   label: "Country",   icon: "globe-icon",    route: .countrySelect),
        .init(id: "settings",  label: "Settings",  icon: "settings-icon", route: .settings),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.element.id) { _, item in
                sidebarButton(item)
            }
        }
        .frame(width: 120, alignment: .topLeading)
        .position(x: 48 + 60, y: 170 + (108 * CGFloat(items.count)) / 2)
    }

    @ViewBuilder
    private func sidebarButton(_ item: Item) -> some View {
        let isActive = matches(active, item.route)
        let isFocused = focused == item.id

        Button {
            router.go(item.route)
        } label: {
            VStack(spacing: 6) {
                BrandImage(name: item.icon)
                    .frame(width: 28, height: 28)
                Text(item.label)
                    .font(.ubuntu(16, .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
            }
            .frame(width: 120, height: 100)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isFocused ? Theme.accentFocusBg :
                          isActive  ? Theme.accent.opacity(0.20) : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isFocused ? Theme.accent : .clear, lineWidth: 2)
            )
            .shadow(color: isFocused ? Theme.accent.opacity(0.5) : .clear,
                    radius: 16, x: 0, y: 0)
            .opacity(isFocused ? 1 : 0.85)
        }
        .buttonStyle(.plain)
        .focused($focused, equals: item.id)
    }

    private func matches(_ r: Route, _ target: Route) -> Bool {
        switch (r, target) {
        case (.discover, .discover),
             (.genres, .genres), (.genreList, .genres),
             (.search, .search),
             (.favorites, .favorites),
             (.countrySelect, .countrySelect),
             (.settings, .settings),
             (.login, .settings):
            return true
        default: return false
        }
    }
}

/// Country trigger pill placed in the header at `(1453, 67)`.
struct CountryTriggerHeader: View {
    @EnvironmentObject var country: CountryStore
    @EnvironmentObject var router: TVRouter
    @FocusState private var isFocused: Bool

    var body: some View {
        Button { router.go(.countrySelect) } label: {
            HStack(spacing: 10) {
                Text(country.selectedCountryFlag)
                    .font(.system(size: 24))
                Text(country.selectedCountryCode == "GLOBAL"
                     ? "Global"
                     : country.selectedCountryName)
                    .font(.ubuntu(18, .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                BrandImage(name: "globe-icon")
                    .frame(width: 18, height: 18)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 30)
                    .fill(Color.white.opacity(isFocused ? 0.22 : 0.10))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 30)
                    .stroke(isFocused ? Color.white : .clear, lineWidth: 3)
            )
            .scaleEffect(isFocused ? 1.05 : 1)
        }
        .buttonStyle(.plain)
        .focused($isFocused)
    }
}

/// Login pill in the header at `(1694, 67)`.
struct LoginHeaderButton: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var router: TVRouter
    @FocusState private var isFocused: Bool

    var body: some View {
        Button {
            router.go(auth.isAuthenticated ? .settings : .login)
        } label: {
            HStack(spacing: 6) {
                if auth.isAuthenticated {
                    Circle()
                        .fill(Theme.accent)
                        .frame(width: 34, height: 34)
                        .overlay(
                            Text(String(auth.user?.displayName?.prefix(1) ?? "U"))
                                .font(.ubuntu(16, .bold))
                                .foregroundColor(.white)
                        )
                } else {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 22))
                        .foregroundColor(.white)
                    Text("Login")
                        .font(.ubuntu(18, .bold))
                        .foregroundColor(.white)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .frame(height: 51)
            .background(
                RoundedRectangle(cornerRadius: 30)
                    .fill(auth.isAuthenticated ? Color.white.opacity(0.10) : Theme.accent)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 30)
                    .stroke(isFocused ? Color.white : .clear, lineWidth: 4)
            )
            .shadow(color: isFocused ? Theme.accent.opacity(0.8) : .clear, radius: 30)
            .scaleEffect(isFocused ? 1.10 : 1)
        }
        .buttonStyle(.plain)
        .focused($isFocused)
    }
}

/// Global mini-player rendered at the bottom of every screen except the
/// dedicated RadioPlaying / Splash / Guide pages.
struct GlobalPlayerView: View {
    @EnvironmentObject var player: AudioPlayer
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var favorites: FavoritesStore
    @FocusState private var focused: String?

    var body: some View {
        if let station = player.currentStation {
            VStack {
                Spacer()
                HStack(spacing: 20) {
                    StationArtwork(url: station.artworkURL, size: 72, cornerRadius: 12)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(player.nowPlayingTitle ?? station.name)
                            .font(.ubuntu(22, .bold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        Text(player.nowPlayingArtist ?? station.country ?? "")
                            .font(.ubuntu(16, .regular))
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Button { player.togglePlayPause() } label: {
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 60, height: 60)
                            .background(Circle().fill(Theme.accent))
                            .scaleEffect(focused == "play" ? 1.1 : 1)
                    }
                    .buttonStyle(.plain)
                    .focused($focused, equals: "play")

                    Button { favorites.toggle(station) } label: {
                        Image(systemName: favorites.isFavorite(station) ? "heart.fill" : "heart")
                            .font(.system(size: 24))
                            .foregroundColor(favorites.isFavorite(station) ? Theme.accent : .white)
                            .frame(width: 56, height: 56)
                            .background(Circle().fill(Color.white.opacity(0.10)))
                            .scaleEffect(focused == "fav" ? 1.1 : 1)
                    }
                    .buttonStyle(.plain)
                    .focused($focused, equals: "fav")

                    Button { router.go(.radioPlaying) } label: {
                        Image(systemName: "arrow.up.left.and.arrow.down.right")
                            .font(.system(size: 22))
                            .foregroundColor(.white)
                            .frame(width: 56, height: 56)
                            .background(Circle().fill(Color.white.opacity(0.10)))
                            .scaleEffect(focused == "expand" ? 1.1 : 1)
                    }
                    .buttonStyle(.plain)
                    .focused($focused, equals: "expand")
                }
                .padding(.horizontal, 28)
                .padding(.vertical, 16)
                .frame(width: 1500, height: 110)
                .background(
                    RoundedRectangle(cornerRadius: 28)
                        .fill(.ultraThinMaterial)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 28)
                        .stroke(.white.opacity(0.10), lineWidth: 1)
                )
                .padding(.bottom, 32)
            }
            .frame(width: 1920, height: 1080, alignment: .bottom)
        }
    }
}
