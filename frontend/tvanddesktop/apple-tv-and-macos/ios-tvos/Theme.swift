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
/// Files live in `Assets/Images/`. Searches both the bundle root (when files
/// are added as a `group`) and the `Assets/Images` subdirectory (when added
/// as a `folder` reference) so we work in either xcodegen configuration.
struct BrandImage: View {
    let name: String
    var contentMode: ContentMode = .fit

    /// Cache lookups to avoid hitting the filesystem on every redraw.
    /// Protected by a lock so SwiftUI's parallel renders don't race.
    private static let cacheLock = NSLock()
    private static var cache: [String: UIImage?] = [:]

    private static func load(_ name: String) -> UIImage? {
        cacheLock.lock()
        if let hit = cache[name] { cacheLock.unlock(); return hit }
        cacheLock.unlock()

        let bundle = Bundle.main

        // 1. Look at bundle root (group reference).
        if let url = bundle.url(forResource: name, withExtension: "png"),
           let img = UIImage(contentsOfFile: url.path) {
            cacheLock.lock(); cache[name] = img; cacheLock.unlock()
            return img
        }
        // 2. Look in `Assets/Images/` subdirectory (folder reference).
        if let url = bundle.url(forResource: name, withExtension: "png",
                                subdirectory: "Assets/Images"),
           let img = UIImage(contentsOfFile: url.path) {
            cacheLock.lock(); cache[name] = img; cacheLock.unlock()
            return img
        }
        // 3. Look in `Images/` subdirectory.
        if let url = bundle.url(forResource: name, withExtension: "png",
                                subdirectory: "Images"),
           let img = UIImage(contentsOfFile: url.path) {
            cacheLock.lock(); cache[name] = img; cacheLock.unlock()
            return img
        }
        // 4. Fall back to asset catalog symbol (works for Brand/* set).
        if let img = UIImage(named: name) {
            cacheLock.lock(); cache[name] = img; cacheLock.unlock()
            return img
        }
        NSLog("[BrandImage] missing asset: \(name).png")
        cacheLock.lock(); cache[name] = nil; cacheLock.unlock()
        return nil
    }

    var body: some View {
        #if canImport(UIKit)
        if let img = Self.load(name) {
            Image(uiImage: img).resizable().aspectRatio(contentMode: contentMode)
        } else {
            Color.clear
        }
        #else
        Color.clear
        #endif
    }
}

// MARK: - Focus halo removal

#if os(tvOS)
/// Strip the tvOS default white focus halo + tilt animation from a view.
/// Pair this with `@FocusState` + your own ring/scale to fully match the
/// web-preview look (pink 4-px border, glow, scale).
extension View {
    /// Wraps content in a focusable container that has NO default styling.
    /// Pass a closure that styles the content using the supplied `isFocused`
    /// boolean — exactly how the web app does it.
    func tvFocusable<Focused: View>(
        @ViewBuilder _ focused: @escaping (Bool) -> Focused
    ) -> some View {
        TVFocusableContainer(content: { focused($0) })
    }
}

/// Custom focusable that doesn't apply the default focus appearance.
struct TVFocusableContainer<Content: View>: View {
    @ViewBuilder var content: (Bool) -> Content
    @FocusState private var isFocused: Bool
    var onSelect: () -> Void = {}

    var body: some View {
        content(isFocused)
            .focusable(true)
            .focused($isFocused)
            .onTapGesture { onSelect() }
    }
}
#endif

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
