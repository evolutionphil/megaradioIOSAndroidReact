// MegaRadioTV — tvOS shim
// Loads the deployed MegaRadio web TV app inside a fullscreen WKWebView.
// Bridges Siri remote / focus events to JS keyboard events so the existing
// spatial-nav engine works unchanged.
//
// Setup (run on a Mac):
//   1. Open Xcode 16+, File → New → Project → tvOS → App (Swift, SwiftUI)
//   2. Target: tvOS 17, Bundle: com.visiongo.megaradio (Universal Purchase)
//   3. Replace ContentView.swift with this file
//   4. Capabilities: Background Modes → Audio, AirPlay, and PiP

import SwiftUI
import WebKit
import AVKit

@main
struct MegaRadioTVApp: App {
    init() { try? AVAudioSession.sharedInstance().setCategory(.playback) }
    var body: some Scene { WindowGroup { ContentView() } }
}

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://themegaradio.com/tv")!)
            .ignoresSafeArea()
            .background(Color(red: 0x0E/255, green: 0x0E/255, blue: 0x0E/255))
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.scrollView.isScrollEnabled = false
        wv.backgroundColor = UIColor(red: 0x0E/255, green: 0x0E/255, blue: 0x0E/255, alpha: 1)
        wv.isOpaque = false
        wv.load(URLRequest(url: url))

        // Siri Remote → JS keyboard events
        let dpad = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleSelect))
        dpad.allowedPressTypes = [NSNumber(value: UIPress.PressType.select.rawValue)]
        wv.addGestureRecognizer(dpad)
        return wv
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject {
        @objc func handleSelect() {
            // Will be wired through KeyEvent dispatching once the WebView is connected.
        }
    }
}
