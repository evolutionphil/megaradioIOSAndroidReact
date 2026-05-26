// Theme.swift — Brand tokens + Ubuntu font helpers + pixel-perfect 1920×1080 staging.
//
// The MegaRadio web/TV preview is hand-laid against a fixed 1920×1080 stage
// using Ubuntu (300/400/500/700). To get a *1:1* visual clone on Apple TV we:
//   1. Bundle the four Ubuntu .ttf weights (declared in project.yml UIAppFonts).
//   2. Render every screen inside a `Stage1920x1080` view that uses absolute
//      coordinates identical to the web React code. tvOS native resolution
//      is also 1920×1080, so no scaling is required.

import SwiftUI

// MARK: - Brand colors (sampled from web-preview Tailwind classes)

enum Theme {
    /// `bg-[#0e0e0e]` — app background.
    static let background      = Color(red: 0x0E/255, green: 0x0E/255, blue: 0x0E/255)
    /// `bg-[#1a1a1a]` — modal / surface.
    static let surface         = Color(red: 0x1A/255, green: 0x1A/255, blue: 0x1A/255)
    /// `bg-[#1a1a2e]` — help modal surface.
    static let surfaceAlt      = Color(red: 0x1A/255, green: 0x1A/255, blue: 0x2E/255)
    /// `#ff4199` — pink brand accent used everywhere (focus, CTA, glow).
    static let accent          = Color(red: 0xFF/255, green: 0x41/255, blue: 0x99/255)
    /// Soft pink ring focus state.
    static let accentFocusBg   = Color(red: 0xFF/255, green: 0x41/255, blue: 0x99/255).opacity(0.25)
    /// `#e95252` — Red bullet / red remote.
    static let red             = Color(red: 0xE9/255, green: 0x52/255, blue: 0x52/255)
    /// `#9b9b9b` — Splash tagline grey.
    static let grayTagline     = Color(red: 0x9B/255, green: 0x9B/255, blue: 0x9B/255)
    /// Translucent white tier.
    static let textPrimary     = Color.white
    static let textSecondary   = Color.white.opacity(0.70)
    static let textTertiary    = Color.white.opacity(0.45)
}

// MARK: - Ubuntu font helpers

enum UbuntuWeight: String {
    case light   = "Ubuntu-Light"
    case regular = "Ubuntu-Regular"
    case medium  = "Ubuntu-Medium"
    case bold    = "Ubuntu-Bold"
}

extension Font {
    /// Bundled Ubuntu font. Falls back to system if the .ttf failed to load.
    static func ubuntu(_ size: CGFloat, _ weight: UbuntuWeight = .regular) -> Font {
        .custom(weight.rawValue, size: size)
    }
}

// MARK: - Stage modifier (1920 × 1080 absolute layout)

/// Wraps a view in a fixed 1920×1080 ZStack so children can use `.position`,
/// `.offset`, and pixel-exact `.frame` values copied straight from the React
/// source code. tvOS apps run at native 1920×1080 so no scaling is required;
/// during preview / smaller windows we centre and clip the stage.
struct Stage1920x1080<Content: View>: View {
    let content: () -> Content
    init(@ViewBuilder _ content: @escaping () -> Content) { self.content = content }
    var body: some View {
        ZStack(alignment: .topLeading) {
            Theme.background.ignoresSafeArea()
            content()
        }
        .frame(width: 1920, height: 1080, alignment: .topLeading)
        .clipped()
    }
}

// MARK: - Resource helpers

/// Resolves a bundled image (PNG converted from the web SVG/PNG assets).
/// Files live in `Assets/Images/` (flat folder, added as `buildPhase: resources`).
struct BrandImage: View {
    let name: String
    var contentMode: ContentMode = .fit
    var body: some View {
        #if canImport(UIKit)
        if let url = Bundle.main.url(forResource: name, withExtension: "png"),
           let img = UIImage(contentsOfFile: url.path) {
            Image(uiImage: img).resizable().aspectRatio(contentMode: contentMode)
        } else {
            Color.clear
        }
        #else
        Color.clear
        #endif
    }
}

// MARK: - Station artwork

/// Async image with rounded placeholder.
struct StationArtwork: View {
    let url: URL?
    let size: CGFloat
    var cornerRadius: CGFloat = 16

    var body: some View {
        Group {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:   placeholder
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
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    }

    private var placeholder: some View {
        ZStack {
            LinearGradient(
                colors: [Theme.accent.opacity(0.4), Theme.surface],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            BrandImage(name: "fallback-station")
                .padding(size * 0.18)
        }
    }
}
