// Discover.swift — Port of `web-preview/src/pages/DiscoverNoUser.tsx`.
//
// Layout (1920×1080):
//   • Hand-crowd hero image, full bleed, with gradient overlay fading to bg.
//   • MegaRadio logo top-left (30, 64).
//   • Header (top): CountryTrigger (1453, 67) + Login (1694, 67).
//   • Left sidebar (48, 170, 120×760).
//   • Scrollable content area (162, 170, 1758 × 910).
//     Sections:
//       – Recently Played (when present)
//       – For You         (when present)
//       – Genres pills
//       – Popular Right Now (7-column grid 210×280 cards)
//       – Country Stations (7-column infinite scroll)

import SwiftUI

struct DiscoverPage: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var country: CountryStore
    @EnvironmentObject var player: AudioPlayer

    @State private var popular: [Station] = []
    @State private var workingStations: [Station] = []
    @State private var genres: [Genre] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        Stage1920x1080 {
            // ── Hero background.
            BrandImage(name: "hand-crowd-disco-1", contentMode: .fill)
                .frame(width: 1939, height: 1292)
                .offset(x: -10, y: -523)

            // ── Gradient fade to background.
            LinearGradient(
                colors: [Color.clear, Theme.background],
                startPoint: UnitPoint(x: 0.5, y: 0.009),
                endPoint:   UnitPoint(x: 0.5, y: 0.486)
            )
            .frame(width: 1920, height: 1080)

            // ── Logo.
            MegaRadioLogo(scale: 164.421 / 323.069)
                .offset(x: 30, y: 64)

            // ── Header (Country + Login).
            CountryTriggerHeader().offset(x: 1453, y: 67)
            LoginHeaderButton().offset(x: 1694, y: 67)

            // ── Left sidebar.
            AppSidebar(active: .discover)

            // ── Scrollable content area starts at (162, 170) inside the stage.
            DiscoverScrollArea(
                popular: popular,
                stations: workingStations,
                genres: genres,
                loading: loading,
                error: error,
                onPlay: { s in
                    player.play(s)
                    router.go(.radioPlaying)
                },
                onGenre: { g in router.go(.genreList(g.name)) }
            )
            .frame(width: 1758, height: 910)
            .offset(x: 162, y: 170)
        }
        .task(id: country.selectedCountryCode) { await load() }
    }

    private func load() async {
        loading = true
        error = nil
        do {
            let c = country.selectedCountryCode == "GLOBAL" ? nil : country.selectedCountryCode
            async let p = APIClient.shared.fetchPopularStations(country: c, limit: 12)
            async let w = APIClient.shared.fetchPopularStations(country: c, limit: 35)
            async let g = APIClient.shared.fetchGenres(country: c, limit: 30)
            popular         = try await p
            workingStations = try await w
            genres          = try await g
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

// ────────────────────────────────────────────────────────────────────
// Scrollable content area
// ────────────────────────────────────────────────────────────────────

private struct DiscoverScrollArea: View {
    let popular: [Station]
    let stations: [Station]
    let genres: [Genre]
    let loading: Bool
    let error: String?
    let onPlay: (Station) -> Void
    let onGenre: (Genre) -> Void

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 40) {
                if loading {
                    HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }
                        .frame(height: 320)
                        .padding(.top, 200)
                }
                if let error {
                    Text(error)
                        .font(.ubuntu(22))
                        .foregroundColor(Theme.accent)
                        .padding(60)
                }

                // ── Genres pill row.
                if !genres.isEmpty {
                    SectionTitle("Genres")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(genres) { g in
                                GenrePill(name: g.name) { onGenre(g) }
                            }
                        }
                        .padding(.horizontal, 74)
                        .padding(.vertical, 10)
                    }
                }

                // ── Popular Right Now row.
                if !popular.isEmpty {
                    SectionTitle("Popular Right Now")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 30) {
                            ForEach(popular) { s in
                                StationCardLarge(station: s) { onPlay(s) }
                            }
                        }
                        .padding(.horizontal, 74)
                        .padding(.vertical, 10)
                    }
                }

                // ── Country stations grid (7 per row).
                if !stations.isEmpty {
                    SectionTitle("Stations")
                    LazyVGrid(
                        columns: Array(repeating: GridItem(.fixed(210), spacing: 20),
                                       count: 7),
                        spacing: 30
                    ) {
                        ForEach(stations) { s in
                            StationCardLarge(station: s) { onPlay(s) }
                        }
                    }
                    .padding(.horizontal, 74)
                    .padding(.bottom, 120)
                }
            }
            .padding(.top, 20)
        }
        .clipped()
    }
}

private struct SectionTitle: View {
    let text: String
    init(_ t: String) { text = t }
    var body: some View {
        Text(text)
            .font(.ubuntu(32, .bold))
            .foregroundColor(.white)
            .padding(.leading, 74)
    }
}

// ────────────────────────────────────────────────────────────────────
// Cards & pills
// ────────────────────────────────────────────────────────────────────

struct StationCardLarge: View {
    let station: Station
    let onPlay: () -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: onPlay) {
            VStack(alignment: .leading, spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 11)
                        .fill(Color.white)
                    StationArtwork(url: station.artworkURL, size: 168, cornerRadius: 7)
                }
                .frame(width: 210, height: 210)
                .overlay(
                    RoundedRectangle(cornerRadius: 11)
                        .stroke(isFocused ? Theme.accent : .clear, lineWidth: 4)
                )
                .scaleEffect(isFocused ? 1.06 : 1.0)
                .shadow(color: isFocused ? Theme.accent.opacity(0.6) : .clear,
                        radius: 24)

                Text(station.name)
                    .font(.ubuntu(18, .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .frame(width: 210, alignment: .leading)
                Text(station.tags?.split(separator: ",").first.map(String.init) ?? (station.country ?? ""))
                    .font(.ubuntu(15))
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(1)
                    .frame(width: 210, alignment: .leading)
            }
        }
        .buttonStyle(.plain)
        .focused($isFocused)
        .animation(.easeOut(duration: 0.18), value: isFocused)
    }
}

struct GenrePill: View {
    let name: String
    let onTap: () -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: onTap) {
            Text(name.capitalized)
                .font(.ubuntu(18, .medium))
                .foregroundColor(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(
                    Capsule().fill(isFocused
                                   ? Theme.accent
                                   : Color.white.opacity(0.10))
                )
                .overlay(
                    Capsule().stroke(isFocused ? .white : .clear, lineWidth: 2)
                )
                .scaleEffect(isFocused ? 1.08 : 1)
        }
        .buttonStyle(.plain)
        .focused($isFocused)
    }
}

// Compact "recently played" card matches the 180×220 web spec.
struct RecentStationCard: View {
    let station: Station
    let onPlay: () -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: onPlay) {
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 11)
                    .fill(Color.white.opacity(isFocused ? 0.22 : 0.14))
                    .frame(width: 180, height: 220)

                StationArtwork(url: station.artworkURL, size: 120, cornerRadius: 6.6)
                    .offset(x: 30, y: 20)

                Text(station.name)
                    .font(.ubuntu(18, .medium))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .frame(width: 160, alignment: .center)
                    .offset(x: 10, y: 152)
            }
            .frame(width: 180, height: 220)
            .overlay(
                RoundedRectangle(cornerRadius: 11)
                    .stroke(isFocused ? Theme.accent : .clear, lineWidth: 4)
            )
            .scaleEffect(isFocused ? 1.06 : 1)
            .shadow(color: isFocused ? Theme.accent.opacity(0.6) : .clear, radius: 18)
        }
        .buttonStyle(.plain)
        .focused($isFocused)
    }
}
