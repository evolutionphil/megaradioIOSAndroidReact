// Views.swift — Root router + shared components for MegaRadio TV.
//
// Every reusable widget porting a piece of `web-preview/src/components/*.tsx`
// lives here:
//   • MegaRadioLogo       — `web-preview/.../Splash.tsx`+`DiscoverNoUser.tsx`
//   • AppSidebar          — `web-preview/src/components/Sidebar.tsx`
//   • CountryTriggerHeader/ LoginHeaderButton — header pills (1453, 67) / (1694, 67)
//   • GlobalPlayerView    — `web-preview/src/components/GlobalPlayer.tsx`
//
// Plus the root router that swaps pages based on `TVRouter.route`.

import SwiftUI

// ────────────────────────────────────────────────────────────────────
// Custom button style — fully transparent (no default tvOS halo).
// ────────────────────────────────────────────────────────────────────

#if os(tvOS)
/// Removes tvOS's default white focus halo so we can apply our own pink
/// border / glow / scale animations that match the web design exactly.
struct TVTransparentButtonStyle: PrimitiveButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(Rectangle())
            .onTapGesture { configuration.trigger() }
    }
}

extension PrimitiveButtonStyle where Self == TVTransparentButtonStyle {
    static var tvTransparent: TVTransparentButtonStyle { TVTransparentButtonStyle() }
}
#endif

// ────────────────────────────────────────────────────────────────────
// Root router
// ────────────────────────────────────────────────────────────────────

struct RootRouterView: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var player: AudioPlayer

    var body: some View {
        ZStack {
            currentPage
                .id(routeID)
                .transition(.opacity)

            // Persistent global player (matches web `GlobalPlayer`).
            if let _ = player.currentStation, !shouldHideGlobalPlayer {
                GlobalPlayerView()
                    .allowsHitTesting(true)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: router.route)
    }

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
// MegaRadioLogo — 1:1 port of the web `images/path-8.svg` + wordmark.
// ────────────────────────────────────────────────────────────────────

/// Splash size: 323.069 × 112. Header size: 164.421 × 57 (scale = 0.5085).
struct MegaRadioLogo: View {
    let scale: CGFloat
    init(scale: CGFloat = 1.0) { self.scale = scale }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Pink swoosh (`images/path-8.svg`), occupies left 34.8% of width.
            BrandImage(name: "path-8")
                .frame(width: 323.069 * 0.348 * scale, height: 112 * scale)

            // Wordmark "mega" Bold + "radio" Regular — 53.108 px font.
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

// ────────────────────────────────────────────────────────────────────
// AppSidebar — 1:1 port of `web-preview/src/components/Sidebar.tsx`.
// Position: left:48, top:170, width:120, height:760.
// Item: 120×100 each, 108 px vertical pitch (8 px gap).
// ────────────────────────────────────────────────────────────────────

struct AppSidebar: View {
    let active: Route
    @EnvironmentObject var router: TVRouter

    fileprivate struct Item {
        let id: String
        let label: String
        let icon: String   // PNG asset name in `Assets/Images/`
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
        ZStack(alignment: .topLeading) {
            ForEach(Array(items.enumerated()), id: \.element.id) { idx, item in
                SidebarItemView(
                    item: item,
                    isActive: matches(active, item.route)
                ) {
                    router.go(item.route)
                }
                .offset(x: 0, y: CGFloat(idx) * 108)
            }
        }
        .frame(width: 120, height: 760, alignment: .topLeading)
        .offset(x: 48, y: 170)
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

/// Single sidebar item. Uses `tvTransparent` button style so we control
/// the focus appearance entirely (no white halo, no tilt).
private struct SidebarItemView: View {
    let item: SidebarItem
    let isActive: Bool
    let onTap: () -> Void
    @FocusState private var isFocused: Bool

    typealias SidebarItem = AppSidebar.Item

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 6) {
                BrandImage(name: item.icon)
                    .frame(width: 28, height: 28)
                Text(item.label)
                    .font(.ubuntu(16, .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .frame(width: 104)
            }
            .frame(width: 120, height: 100)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(
                        isFocused ? Theme.accent.opacity(0.25)
                        : isActive ? Theme.accent.opacity(0.20)
                        : Color.clear
                    )
            )
            .shadow(color: isFocused ? Theme.accent.opacity(0.5) : .clear,
                    radius: 16, x: 0, y: 0)
            .opacity(isFocused ? 1 : 0.85)
        }
        .buttonStyle(.tvTransparent)
        .focused($isFocused)
        .animation(.easeInOut(duration: 0.2), value: isFocused)
    }
}

// ────────────────────────────────────────────────────────────────────
// Header pills
// ────────────────────────────────────────────────────────────────────

/// Country trigger at (1453, 67).
/// Web: rounded white pill, flag + name + globe icon.
struct CountryTriggerHeader: View {
    @EnvironmentObject var country: CountryStore
    @EnvironmentObject var router: TVRouter
    @FocusState private var isFocused: Bool

    var body: some View {
        Button { router.go(.countrySelect) } label: {
            HStack(spacing: 10) {
                Text(country.selectedCountryFlag).font(.system(size: 24))
                Text(country.selectedCountryCode == "GLOBAL" ? "Global" : country.selectedCountryName)
                    .font(.ubuntu(18, .bold)).foregroundColor(.white).lineLimit(1)
                BrandImage(name: "globe-icon").frame(width: 18, height: 18)
            }
            .padding(.horizontal, 18).padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 30)
                    .fill(isFocused ? Theme.accent.opacity(0.25) : Color.white.opacity(0.10))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 30)
                    .stroke(isFocused ? Theme.accent : .clear, lineWidth: 3)
            )
            .shadow(color: isFocused ? Theme.accent.opacity(0.6) : .clear, radius: 16)
            .scaleEffect(isFocused ? 1.05 : 1)
        }
        .buttonStyle(.tvTransparent)
        .focused($isFocused)
    }
}

/// Login button at (1694, 67).
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
                    Circle().fill(Theme.accent).frame(width: 34, height: 34)
                        .overlay(
                            Text(String(auth.user?.displayName?.prefix(1) ?? "U"))
                                .font(.ubuntu(16, .bold)).foregroundColor(.white)
                        )
                } else {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 22)).foregroundColor(.white)
                    Text("Login").font(.ubuntu(18, .bold)).foregroundColor(.white)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 8)
            .frame(height: 51)
            .background(
                RoundedRectangle(cornerRadius: 30)
                    .fill(auth.isAuthenticated ? Color.white.opacity(0.10) : Theme.accent)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 30)
                    .stroke(isFocused ? .white : .clear, lineWidth: 4)
            )
            .shadow(color: isFocused ? Theme.accent.opacity(0.8) : .clear, radius: 30)
            .scaleEffect(isFocused ? 1.10 : 1)
        }
        .buttonStyle(.tvTransparent)
        .focused($isFocused)
    }
}

// ────────────────────────────────────────────────────────────────────
// GlobalPlayerView — port of `web-preview/src/components/GlobalPlayer.tsx`.
// Bottom-anchored mini player. No white halos — only pink ring on focus.
// ────────────────────────────────────────────────────────────────────

struct GlobalPlayerView: View {
    @EnvironmentObject var player: AudioPlayer
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var favorites: FavoritesStore

    var body: some View {
        if let station = player.currentStation {
            VStack {
                Spacer()
                HStack(spacing: 20) {
                    StationArtwork(url: station.artworkURL, size: 72, cornerRadius: 12)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(player.nowPlayingTitle ?? station.name)
                            .font(.ubuntu(22, .bold)).foregroundColor(.white).lineLimit(1)
                        Text(player.nowPlayingArtist ?? station.country ?? "")
                            .font(.ubuntu(16)).foregroundColor(Theme.textSecondary).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    miniCircle(
                        symbol: player.isPlaying ? "pause.fill" : "play.fill",
                        primary: true,
                        size: 60
                    ) { player.togglePlayPause() }

                    miniCircle(
                        symbol: favorites.isFavorite(station) ? "heart.fill" : "heart",
                        primary: false,
                        size: 56,
                        tint: favorites.isFavorite(station) ? Theme.accent : .white
                    ) { favorites.toggle(station) }

                    miniCircle(
                        symbol: "arrow.up.left.and.arrow.down.right",
                        primary: false,
                        size: 56
                    ) { router.go(.radioPlaying) }
                }
                .padding(.horizontal, 28).padding(.vertical, 16)
                .frame(width: 1500, height: 110)
                .background(
                    RoundedRectangle(cornerRadius: 28).fill(.ultraThinMaterial)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 28).stroke(.white.opacity(0.10), lineWidth: 1)
                )
                .padding(.bottom, 32)
            }
            .frame(width: 1920, height: 1080, alignment: .bottom)
        }
    }

    @ViewBuilder
    private func miniCircle(
        symbol: String, primary: Bool, size: CGFloat,
        tint: Color = .white, action: @escaping () -> Void
    ) -> some View {
        FocusableCircle(size: size, action: action) { isFocused in
            ZStack {
                Circle().fill(primary ? Theme.accent : Color.black)
                Image(systemName: symbol)
                    .font(.system(size: size * 0.42, weight: .bold))
                    .foregroundColor(tint)
            }
            .overlay(
                Circle().stroke(isFocused ? Theme.accent : .clear, lineWidth: 4)
            )
            .shadow(color: isFocused ? Theme.accent.opacity(0.8) : .clear, radius: 28)
        }
    }
}
