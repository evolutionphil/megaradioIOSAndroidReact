// Favorites.swift — Port of `web-preview/src/pages/Favorites.tsx`.

import SwiftUI

struct FavoritesPage: View {
    @EnvironmentObject var favorites: FavoritesStore
    @EnvironmentObject var player: AudioPlayer
    @EnvironmentObject var router: TVRouter

    var body: some View {
        Stage1920x1080 {
            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            CountryTriggerHeader().offset(x: 1453, y: 67)
            LoginHeaderButton().offset(x: 1694, y: 67)
            AppSidebar(active: .favorites)

            VStack(alignment: .leading, spacing: 30) {
                Text("Favorites").font(.ubuntu(56, .bold)).foregroundColor(.white)

                if favorites.stations.isEmpty {
                    VStack(spacing: 24) {
                        BrandImage(name: "heart-icon")
                            .frame(width: 160, height: 160)
                            .opacity(0.35)
                        Text("No favorites yet")
                            .font(.ubuntu(32, .bold)).foregroundColor(.white)
                        Text("Tap the heart on any station to add it here.")
                            .font(.ubuntu(22))
                            .foregroundColor(Theme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 120)
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.fixed(210), spacing: 20), count: 7),
                            spacing: 30
                        ) {
                            ForEach(favorites.stations) { s in
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
    }
}
