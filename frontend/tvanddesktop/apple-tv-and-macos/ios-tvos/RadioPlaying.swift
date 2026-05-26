// RadioPlaying.swift — Port of `web-preview/src/pages/RadioPlaying.tsx`.
//
// Full-screen now-playing experience with large blurred artwork backdrop,
// 480×480 album-art on the left, station title + metadata on the right,
// play/pause + favorite + back-to-discover controls.

import SwiftUI

struct RadioPlayingPage: View {
    @EnvironmentObject var player: AudioPlayer
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var favorites: FavoritesStore
    @FocusState private var focused: String?

    var body: some View {
        Stage1920x1080 {
            if let station = player.currentStation {
                // ── Blurred backdrop using the station artwork.
                AsyncImage(url: station.artworkURL) { phase in
                    if let img = phase.image { img.resizable().scaledToFill() }
                    else { Theme.background }
                }
                .frame(width: 1920, height: 1080)
                .blur(radius: 60)
                .overlay(Color.black.opacity(0.55))

                // ── Logo (top-left).
                MegaRadioLogo(scale: 164.421 / 323.069)
                    .offset(x: 30, y: 64)

                // ── Sidebar.
                AppSidebar(active: .discover)

                // ── 480×480 artwork (left, vertically centered).
                StationArtwork(url: station.artworkURL, size: 480, cornerRadius: 32)
                    .shadow(color: .black.opacity(0.6), radius: 40, x: 0, y: 20)
                    .offset(x: 260, y: 280)

                // ── Station title block (right of artwork).
                VStack(alignment: .leading, spacing: 18) {
                    if let tag = station.tags?.split(separator: ",").first {
                        Text(String(tag).uppercased())
                            .font(.ubuntu(20, .bold))
                            .foregroundColor(Theme.accent)
                            .tracking(2)
                    }
                    Text(station.name)
                        .font(.ubuntu(64, .bold))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    if let t = player.nowPlayingTitle {
                        Text(t)
                            .font(.ubuntu(32, .medium))
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                    if let a = player.nowPlayingArtist {
                        Text(a)
                            .font(.ubuntu(26, .regular))
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                    }
                    Text(station.country ?? "")
                        .font(.ubuntu(20))
                        .foregroundColor(Theme.textTertiary)
                        .padding(.top, 16)

                    // ── Controls row.
                    HStack(spacing: 28) {
                        controlButton("play",
                                       icon: player.isPlaying ? "pause.fill" : "play.fill",
                                       primary: true,
                                       size: 96) {
                            player.togglePlayPause()
                        }
                        controlButton("fav",
                                       icon: favorites.isFavorite(station) ? "heart.fill" : "heart",
                                       primary: false,
                                       size: 76) {
                            favorites.toggle(station)
                        }
                        controlButton("back",
                                       icon: "chevron.left",
                                       primary: false,
                                       size: 76) {
                            router.back()
                        }
                    }
                    .padding(.top, 36)
                }
                .frame(width: 840, alignment: .leading)
                .offset(x: 820, y: 320)

                // ── Buffering indicator.
                if player.isBuffering {
                    ProgressView()
                        .scaleEffect(2.5)
                        .tint(Theme.accent)
                        .offset(x: 500, y: 500)
                }
            } else {
                Text("No station playing")
                    .font(.ubuntu(32))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onAppear { focused = "play" }
    }

    @ViewBuilder
    private func controlButton(_ id: String, icon: String,
                               primary: Bool, size: CGFloat,
                               action: @escaping () -> Void) -> some View {
        let isFocused = focused == id
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size * 0.42, weight: .bold))
                .foregroundColor(.white)
                .frame(width: size, height: size)
                .background(
                    Circle().fill(primary ? Theme.accent : Color.white.opacity(0.15))
                )
                .overlay(
                    Circle().stroke(isFocused ? .white : .clear, lineWidth: 4)
                )
                .scaleEffect(isFocused ? 1.1 : 1)
                .shadow(color: isFocused ? Theme.accent.opacity(0.7) : .clear, radius: 30)
        }
        .buttonStyle(.plain)
        .focused($focused, equals: id)
    }
}
