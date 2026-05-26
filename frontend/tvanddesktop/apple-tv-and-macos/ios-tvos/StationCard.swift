// StationCard.swift — Reusable TV-focusable station card.

import SwiftUI

struct StationCard: View {
    let station: Station
    var size: CGFloat = 260
    let onPlay: (Station) -> Void

    var body: some View {
        Button {
            onPlay(station)
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                StationArtwork(url: station.artworkURL, size: size)
                VStack(alignment: .leading, spacing: 4) {
                    Text(station.name)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(1)
                    if let c = station.country, !c.isEmpty {
                        Text(c)
                            .font(.system(size: 17, weight: .regular))
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                    }
                }
                .padding(.horizontal, 6)
            }
            .frame(width: size)
        }
        .buttonStyle(.card)   // tvOS built-in focus tilt + scale animation
    }
}

struct CompactStationRow: View {
    let station: Station
    let onPlay: (Station) -> Void

    var body: some View {
        Button {
            onPlay(station)
        } label: {
            HStack(spacing: 24) {
                StationArtwork(url: station.artworkURL, size: 110)
                VStack(alignment: .leading, spacing: 6) {
                    Text(station.name)
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(1)
                    HStack(spacing: 12) {
                        if let c = station.country, !c.isEmpty {
                            Text(c).font(.system(size: 18)).foregroundColor(Theme.textSecondary)
                        }
                        if let b = station.bitrate, b > 0 {
                            Text("\(b) kbps").font(.system(size: 18)).foregroundColor(Theme.textTertiary)
                        }
                    }
                    if let tags = station.tags, !tags.isEmpty {
                        Text(tags).font(.system(size: 16)).foregroundColor(Theme.textTertiary).lineLimit(1)
                    }
                }
                Spacer()
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 44))
                    .foregroundColor(Theme.accent)
            }
            .padding(20)
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18))
        }
        .buttonStyle(.card)
    }
}
