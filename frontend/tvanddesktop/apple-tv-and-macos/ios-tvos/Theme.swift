// Theme.swift — Brand colors + tvOS-optimized styling helpers.

import SwiftUI

enum Theme {
    /// Background (#0E0E0E) — matches the existing TV web preview.
    static let background = Color(red: 0x0E/255.0, green: 0x0E/255.0, blue: 0x0E/255.0)
    /// Slightly raised surface for cards.
    static let surface    = Color(red: 0x1A/255.0, green: 0x1A/255.0, blue: 0x1A/255.0)
    /// Brand accent (red used in iOS app logo).
    static let accent     = Color(red: 0xE6/255.0, green: 0x2D/255.0, blue: 0x2D/255.0)
    /// Primary text on dark.
    static let textPrimary    = Color.white
    static let textSecondary  = Color.white.opacity(0.65)
    static let textTertiary   = Color.white.opacity(0.45)
}

/// Async image with rounded placeholder — replaces SwiftUI's AsyncImage which
/// has poor focus interactions on tvOS.
struct StationArtwork: View {
    let url: URL?
    let size: CGFloat

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty: placeholder
                    case .success(let img): img.resizable().scaledToFill()
                    case .failure: placeholder
                    @unknown default: placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var placeholder: some View {
        ZStack {
            LinearGradient(
                colors: [Theme.accent.opacity(0.4), Theme.surface],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            Image(systemName: "radio")
                .font(.system(size: size * 0.35, weight: .light))
                .foregroundColor(.white.opacity(0.6))
        }
    }
}
