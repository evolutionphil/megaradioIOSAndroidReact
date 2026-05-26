// Genres.swift — Port of `web-preview/src/pages/Genres.tsx` + `GenreList.tsx`.

import SwiftUI

struct GenresPage: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var country: CountryStore

    @State private var genres: [Genre] = []
    @State private var loading = true

    var body: some View {
        Stage1920x1080 {
            // ── Hero gradient background.
            LinearGradient(
                colors: [Theme.accent.opacity(0.25), Theme.background],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .frame(width: 1920, height: 1080)

            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            CountryTriggerHeader().offset(x: 1453, y: 67)
            LoginHeaderButton().offset(x: 1694, y: 67)
            AppSidebar(active: .genres)

            VStack(alignment: .leading, spacing: 30) {
                Text("Genres")
                    .font(.ubuntu(56, .bold))
                    .foregroundColor(.white)

                if loading {
                    HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }
                        .frame(height: 600)
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.fixed(330), spacing: 30), count: 5),
                            spacing: 30
                        ) {
                            ForEach(genres) { g in
                                GenreTile(genre: g) {
                                    router.go(.genreList(g.name))
                                }
                            }
                        }
                        .padding(.bottom, 100)
                    }
                }
            }
            .frame(width: 1700, height: 910, alignment: .topLeading)
            .offset(x: 192, y: 170)
        }
        .task { await load() }
    }

    private func load() async {
        loading = true
        let c = country.selectedCountryCode == "GLOBAL" ? nil : country.selectedCountryCode
        do { genres = try await APIClient.shared.fetchGenres(country: c, limit: 60) } catch {}
        loading = false
    }
}

private struct GenreTile: View {
    let genre: Genre
    let onTap: () -> Void
    @FocusState private var isFocused: Bool

    private var gradientFor: LinearGradient {
        // Deterministic color per genre name.
        let hash = abs(genre.name.hashValue)
        let palette: [(Color, Color)] = [
            (Color(red: 1.00, green: 0.25, blue: 0.60), Color(red: 0.45, green: 0.10, blue: 0.50)),
            (Color(red: 0.20, green: 0.55, blue: 0.95), Color(red: 0.08, green: 0.10, blue: 0.40)),
            (Color(red: 0.20, green: 0.75, blue: 0.55), Color(red: 0.05, green: 0.30, blue: 0.20)),
            (Color(red: 0.95, green: 0.55, blue: 0.10), Color(red: 0.45, green: 0.20, blue: 0.05)),
            (Color(red: 0.65, green: 0.30, blue: 0.95), Color(red: 0.25, green: 0.10, blue: 0.55)),
        ]
        let (a, b) = palette[hash % palette.count]
        return LinearGradient(colors: [a, b], startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 22)
                    .fill(gradientFor)
                BrandImage(name: "music-icon")
                    .opacity(0.20)
                    .frame(width: 220, height: 220)
                    .offset(x: 120, y: -30)
                Text(genre.name.capitalized)
                    .font(.ubuntu(28, .bold))
                    .foregroundColor(.white)
                    .padding(20)
            }
            .frame(width: 330, height: 180)
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(isFocused ? .white : .clear, lineWidth: 4)
            )
            .scaleEffect(isFocused ? 1.06 : 1)
            .shadow(color: isFocused ? .black.opacity(0.55) : .clear, radius: 24, x: 0, y: 12)
        }
        .buttonStyle(.tvTransparent)
        .focused($isFocused)
    }
}

// ────────────────────────────────────────────────────────────────────
// GenreList — stations filtered by a single genre tag.
// ────────────────────────────────────────────────────────────────────

struct GenreListPage: View {
    let tag: String
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var player: AudioPlayer
    @State private var stations: [Station] = []
    @State private var loading = true

    var body: some View {
        Stage1920x1080 {
            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            CountryTriggerHeader().offset(x: 1453, y: 67)
            LoginHeaderButton().offset(x: 1694, y: 67)
            AppSidebar(active: .genres)

            VStack(alignment: .leading, spacing: 30) {
                HStack(spacing: 16) {
                    Button { router.back() } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 22, weight: .bold))
                            .padding(14)
                            .background(Circle().fill(.white.opacity(0.10)))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.tvTransparent)
                    Text(tag.capitalized).font(.ubuntu(48, .bold)).foregroundColor(.white)
                }

                if loading {
                    HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }
                        .frame(height: 600)
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.fixed(200), spacing: 24), count: 7),
                            spacing: 30
                        ) {
                            ForEach(stations) { s in
                                StationCardLarge(station: s) {
                                    player.play(s)
                                    router.go(.radioPlaying)
                                }
                            }
                        }
                        .padding(.bottom, 100)
                    }
                }
            }
            .frame(width: 1700, height: 910, alignment: .topLeading)
            .offset(x: 192, y: 170)
        }
        .task { await load() }
    }

    private func load() async {
        loading = true
        do { stations = try await APIClient.shared.fetchStationsByGenre(tag, limit: 80) } catch {}
        loading = false
    }
}
