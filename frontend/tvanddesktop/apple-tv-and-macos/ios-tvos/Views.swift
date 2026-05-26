// Views.swift — All SwiftUI screens for MegaRadio TV.

import SwiftUI

// ────────────────────────────────────────────────────────────────────
// Splash
// ────────────────────────────────────────────────────────────────────

struct SplashView: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Theme.background, Color.black],
                startPoint: .top, endPoint: .bottom
            ).ignoresSafeArea()
            VStack(spacing: 32) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.system(size: 120, weight: .light))
                    .foregroundColor(Theme.accent)
                Text("MegaRadio")
                    .font(.system(size: 72, weight: .heavy))
                    .foregroundColor(.white)
                Text("60.000+ stations • Anywhere")
                    .font(.system(size: 24))
                    .foregroundColor(Theme.textSecondary)
                ProgressView().scaleEffect(2)
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────────
// Root — TabView with sidebar
// ────────────────────────────────────────────────────────────────────

struct RootView: View {
    @StateObject private var player = AudioPlayer.shared
    @StateObject private var auth = AuthStore.shared
    @StateObject private var favorites = FavoritesStore.shared
    @State private var selection: Tab = .home

    enum Tab: Hashable { case home, genres, search, favorites, settings }

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label("Discover", systemImage: "sparkles") }
                .tag(Tab.home)

            GenresView()
                .tabItem { Label("Genres", systemImage: "music.note.list") }
                .tag(Tab.genres)

            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }
                .tag(Tab.search)

            FavoritesView()
                .tabItem { Label("Favorites", systemImage: "heart.fill") }
                .tag(Tab.favorites)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "person.crop.circle") }
                .tag(Tab.settings)
        }
        .environmentObject(player)
        .environmentObject(auth)
        .environmentObject(favorites)
        .background(Theme.background.ignoresSafeArea())
        .overlay(alignment: .bottom) {
            if player.currentStation != nil {
                NowPlayingBar().padding(.bottom, 20)
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────────
// Home (Popular stations + featured rows)
// ────────────────────────────────────────────────────────────────────

struct HomeView: View {
    @State private var popular: [Station] = []
    @State private var loading = true
    @State private var error: String?

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 40), count: 4)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 50) {
                HStack {
                    Text("Discover")
                        .font(.system(size: 64, weight: .heavy))
                        .foregroundColor(.white)
                    Spacer()
                }.padding(.horizontal, 60).padding(.top, 40)

                if loading {
                    HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }
                        .frame(height: 400)
                } else if let error {
                    Text(error)
                        .foregroundColor(Theme.accent)
                        .padding(60)
                } else {
                    Text("Popular right now")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 60)
                    LazyVGrid(columns: columns, spacing: 50) {
                        ForEach(popular) { station in
                            StationCard(station: station, size: 280) { s in
                                AudioPlayer.shared.play(s)
                            }
                        }
                    }
                    .padding(.horizontal, 60)
                    .padding(.bottom, 100)
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        loading = true
        error = nil
        do {
            popular = try await APIClient.shared.fetchPopularStations(limit: 40)
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

// ────────────────────────────────────────────────────────────────────
// Genres list → tap → station grid
// ────────────────────────────────────────────────────────────────────

struct GenresView: View {
    @State private var genres: [Genre] = []
    @State private var loading = true

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 30), count: 4)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 40) {
                    Text("Genres")
                        .font(.system(size: 64, weight: .heavy))
                        .foregroundColor(.white)
                        .padding(.horizontal, 60)
                        .padding(.top, 40)

                    if loading {
                        HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }
                            .frame(height: 400)
                    } else {
                        LazyVGrid(columns: columns, spacing: 30) {
                            ForEach(genres) { g in
                                NavigationLink(value: g) {
                                    GenreTile(genre: g)
                                }
                                .buttonStyle(.card)
                            }
                        }
                        .padding(.horizontal, 60)
                        .padding(.bottom, 100)
                    }
                }
            }
            .navigationDestination(for: Genre.self) { g in
                GenreStationsView(genre: g)
            }
            .task { await load() }
        }
    }

    private func load() async {
        loading = true
        do { genres = try await APIClient.shared.fetchGenres(limit: 60) } catch { }
        loading = false
    }
}

struct GenreTile: View {
    let genre: Genre
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: iconForGenre(genre.name))
                .font(.system(size: 60, weight: .light))
                .foregroundColor(.white)
                .frame(width: 320, height: 180)
                .background(
                    LinearGradient(colors: [Theme.accent.opacity(0.7), Theme.surface], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .clipShape(RoundedRectangle(cornerRadius: 18))
            Text(genre.name.capitalized).font(.system(size: 24, weight: .semibold)).foregroundColor(.white)
        }
    }

    private func iconForGenre(_ name: String) -> String {
        let lower = name.lowercased()
        if lower.contains("rock") { return "guitars" }
        if lower.contains("jazz") || lower.contains("blues") { return "music.note" }
        if lower.contains("class") { return "pianokeys" }
        if lower.contains("news") || lower.contains("talk") { return "mic.fill" }
        if lower.contains("pop") || lower.contains("dance") || lower.contains("electronic") { return "waveform" }
        if lower.contains("country") || lower.contains("folk") { return "music.quarternote.3" }
        if lower.contains("hip") || lower.contains("rap") || lower.contains("urban") { return "headphones" }
        return "music.note"
    }
}

struct GenreStationsView: View {
    let genre: Genre
    @State private var stations: [Station] = []
    @State private var loading = true
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 40), count: 4)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 40) {
                Text(genre.name.capitalized).font(.system(size: 56, weight: .heavy)).foregroundColor(.white)
                    .padding(.horizontal, 60).padding(.top, 40)

                if loading {
                    HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }.frame(height: 400)
                } else {
                    LazyVGrid(columns: columns, spacing: 50) {
                        ForEach(stations) { s in
                            StationCard(station: s, size: 280) {
                                AudioPlayer.shared.play($0)
                            }
                        }
                    }
                    .padding(.horizontal, 60).padding(.bottom, 100)
                }
            }
        }
        .task { await load() }
    }
    private func load() async {
        loading = true
        do { stations = try await APIClient.shared.fetchStationsByGenre(genre.name, limit: 60) } catch { }
        loading = false
    }
}

// ────────────────────────────────────────────────────────────────────
// Search
// ────────────────────────────────────────────────────────────────────

struct SearchView: View {
    @State private var query: String = ""
    @State private var results: [Station] = []
    @State private var searching = false
    @State private var debounceTask: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Search").font(.system(size: 56, weight: .heavy)).foregroundColor(.white)
                .padding(.horizontal, 60).padding(.top, 40)

            // tvOS provides system on-screen keyboard via TextField
            TextField("Type a station, artist, or city", text: $query)
                .font(.system(size: 32))
                .foregroundColor(.white)
                .padding(.horizontal, 60)
                .onChange(of: query) { _, newValue in scheduleSearch(newValue) }

            if searching {
                HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }.frame(height: 400)
            } else {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(results) { s in
                            CompactStationRow(station: s) { AudioPlayer.shared.play($0) }
                        }
                    }
                    .padding(.horizontal, 60).padding(.bottom, 100)
                }
            }
            Spacer()
        }
    }

    private func scheduleSearch(_ q: String) {
        debounceTask?.cancel()
        debounceTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            guard !Task.isCancelled else { return }
            await runSearch(q)
        }
    }
    private func runSearch(_ q: String) async {
        let trimmed = q.trimmingCharacters(in: .whitespaces)
        if trimmed.count < 2 { results = []; return }
        searching = true
        do { results = try await APIClient.shared.searchStations(trimmed, limit: 40) } catch { }
        searching = false
    }
}

// ────────────────────────────────────────────────────────────────────
// Favorites
// ────────────────────────────────────────────────────────────────────

struct FavoritesView: View {
    @EnvironmentObject var favorites: FavoritesStore
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 40), count: 4)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 40) {
                Text("Favorites").font(.system(size: 64, weight: .heavy)).foregroundColor(.white)
                    .padding(.horizontal, 60).padding(.top, 40)

                if favorites.stations.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "heart.slash").font(.system(size: 80)).foregroundColor(Theme.textTertiary)
                        Text("No favorites yet").font(.system(size: 32)).foregroundColor(Theme.textSecondary)
                        Text("Press play on any station and add it to favorites.").font(.system(size: 22)).foregroundColor(Theme.textTertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 120)
                } else {
                    LazyVGrid(columns: columns, spacing: 50) {
                        ForEach(favorites.stations) { s in
                            StationCard(station: s, size: 280) { AudioPlayer.shared.play($0) }
                        }
                    }
                    .padding(.horizontal, 60).padding(.bottom, 100)
                }
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────────
// Settings (Login with QR + sign out)
// ────────────────────────────────────────────────────────────────────

struct SettingsView: View {
    @EnvironmentObject var auth: AuthStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 40) {
                Text("Account").font(.system(size: 64, weight: .heavy)).foregroundColor(.white)
                    .padding(.horizontal, 60).padding(.top, 40)

                if auth.isAuthenticated {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Signed in as").font(.system(size: 22)).foregroundColor(Theme.textSecondary)
                        Text(auth.user?.displayName ?? auth.user?.email ?? "MegaRadio user")
                            .font(.system(size: 36, weight: .semibold)).foregroundColor(.white)
                        Button(role: .destructive) { auth.signOut() } label: {
                            Text("Sign Out").font(.system(size: 26)).padding(.horizontal, 40).padding(.vertical, 16)
                        }
                        .padding(.top, 20)
                    }
                    .padding(40)
                    .background(Theme.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .padding(.horizontal, 60)
                } else {
                    LoginPanel()
                }
                Spacer()
            }
        }
    }
}

struct LoginPanel: View {
    @EnvironmentObject var auth: AuthStore

    var body: some View {
        HStack(spacing: 60) {
            VStack(alignment: .leading, spacing: 16) {
                Text("Sign in with your phone").font(.system(size: 36, weight: .bold)).foregroundColor(.white)
                Text("1) Open your camera or browser\n2) Go to www.themegaradio.com/tv\n3) Enter the code shown here")
                    .font(.system(size: 22)).foregroundColor(Theme.textSecondary).lineSpacing(6)

                if let err = auth.lastError {
                    Text(err).font(.system(size: 18)).foregroundColor(Theme.accent)
                }
                if auth.pendingCode == nil {
                    Button { Task { await auth.startPairing() } } label: {
                        Text("Show login code").font(.system(size: 24)).padding(.horizontal, 40).padding(.vertical, 16)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.accent)
                }
            }
            if let code = auth.pendingCode {
                VStack(spacing: 16) {
                    Text("Your code").font(.system(size: 20)).foregroundColor(Theme.textSecondary)
                    Text(code)
                        .font(.system(size: 96, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                        .tracking(8)
                    Text("Waiting for activation…").font(.system(size: 18)).foregroundColor(Theme.textTertiary)
                }
                .frame(width: 480)
                .padding(40)
                .background(Theme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 24))
            }
            Spacer()
        }
        .padding(40)
        .padding(.horizontal, 60)
    }
}

// ────────────────────────────────────────────────────────────────────
// Now Playing — bottom bar + sheet
// ────────────────────────────────────────────────────────────────────

struct NowPlayingBar: View {
    @EnvironmentObject var player: AudioPlayer
    @EnvironmentObject var favorites: FavoritesStore
    @State private var showFullPlayer = false

    var body: some View {
        if let station = player.currentStation {
            HStack(spacing: 24) {
                StationArtwork(url: station.artworkURL, size: 80)
                VStack(alignment: .leading, spacing: 4) {
                    Text(player.nowPlayingTitle ?? station.name)
                        .font(.system(size: 22, weight: .semibold)).foregroundColor(.white).lineLimit(1)
                    Text(player.nowPlayingArtist ?? station.country ?? "")
                        .font(.system(size: 17)).foregroundColor(Theme.textSecondary).lineLimit(1)
                }
                Spacer()
                Button { player.togglePlayPause() } label: {
                    Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 30))
                        .frame(width: 56, height: 56)
                }
                .buttonStyle(.borderless)

                Button { favorites.toggle(station) } label: {
                    Image(systemName: favorites.isFavorite(station) ? "heart.fill" : "heart")
                        .font(.system(size: 26))
                        .foregroundColor(favorites.isFavorite(station) ? Theme.accent : .white)
                }
                .buttonStyle(.borderless)
            }
            .padding(.horizontal, 28).padding(.vertical, 16)
            .frame(maxWidth: 1100)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.08)))
        }
    }
}
