// MegaRadioMacApp.swift — macOS 14+ native shell (AppKit + SwiftUI)
//
// Bu dosya SADECE macOS target'ında derlenir. tvOS target'ında değil.
// Apple TV için ayrı dosya: MegaRadioTVApp.swift (UIKit kullanıyor).
//
// Why a separate file?
//   tvOS uses UIKit (UIView, UIColor, UIPress, AVAudioSession). macOS
//   uses AppKit (NSView, NSColor) and has no AVAudioSession (system
//   audio is managed by AVAudioEngine / AVPlayer directly). Trying to
//   compile a single shared file with `#if os(...)` conditionals every
//   few lines is ugly and error-prone — separate, clean files for each
//   platform are easier to maintain.

#if os(macOS)
import SwiftUI
import WebKit
import AppKit
import AVKit

@main
struct MegaRadioMacApp: App {
    @NSApplicationDelegateAdaptor(MegaRadioMacAppDelegate.self) var delegate

    var body: some Scene {
        WindowGroup {
            ContentViewMac()
                .frame(minWidth: 1280, minHeight: 720)
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)

        // Mini-player mode (320×96 floating window) — Faz 2'de eklenecek.
        // Şimdilik tek ana pencere yeterli.
    }
}

final class MegaRadioMacAppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSLog("[MegaRadioMac] applicationDidFinishLaunching")
        // Ensure window appears even if focus is lost during launch.
        if let window = NSApplication.shared.windows.first {
            window.makeKeyAndOrderFront(nil)
            window.center()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

struct ContentViewMac: View {
    var body: some View {
        WebViewHostMac()
            .ignoresSafeArea()
            .background(Color(red: 0x0E/255, green: 0x0E/255, blue: 0x0E/255))
    }
}

/// AppKit's NSViewRepresentable equivalent of WebViewHost.
struct WebViewHostMac: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = NSColor(red: 0x0E/255, green: 0x0E/255, blue: 0x0E/255, alpha: 1).cgColor

        let cfg = WKWebViewConfiguration()
        // macOS WebKit has different feature flags than iOS/tvOS.
        // `mediaTypesRequiringUserActionForPlayback` is iOS/tvOS only.
        if #available(macOS 11.0, *) {
            cfg.defaultWebpagePreferences.allowsContentJavaScript = true
        }
        cfg.suppressesIncrementalRendering = false

        let webView = WKWebView(frame: .zero, configuration: cfg)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.setValue(false, forKey: "drawsBackground") // Transparent background
        webView.allowsBackForwardNavigationGestures = false

        // Load the production TV web preview.
        let urlString = ProcessInfo.processInfo.environment["MEGARADIO_TV_URL"]
            ?? "https://www.themegaradio.com/tv"
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }

        container.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            webView.topAnchor.constraint(equalTo: container.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        return container
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        // No-op — the WebView is configured once in makeNSView.
    }
}
#endif
