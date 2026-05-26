// MegaRadioTVApp.swift — Apple TV main entry point (native SwiftUI).
//
// Apple TV does NOT support WKWebView, so we cannot reuse the TV web
// preview here. Instead this is a native SwiftUI app that talks to the
// same MegaRadio backend API (https://api.themegaradio.com) the iOS and
// Android apps use, and presents the same content with tvOS-optimized
// focus engine + AVPlayer streaming.

import SwiftUI
import AVFoundation

#if os(tvOS)

@main
struct MegaRadioTVApp: App {
    @State private var didFinishSplash = false

    init() {
        configureAudioSession()
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                Theme.background.ignoresSafeArea()
                if didFinishSplash {
                    RootView()
                        .transition(.opacity)
                } else {
                    SplashView()
                        .transition(.opacity)
                        .task {
                            // Brief splash so Firebase/initial assets settle.
                            try? await Task.sleep(nanoseconds: 1_200_000_000)
                            withAnimation(.easeInOut(duration: 0.45)) {
                                didFinishSplash = true
                            }
                        }
                }
            }
            .preferredColorScheme(.dark)
        }
    }

    /// Set up the global audio session for live-stream radio playback.
    /// On tvOS this enables background audio + AirPlay routing.
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.allowAirPlay]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            NSLog("[MegaRadioTV] AVAudioSession setup failed: \(error)")
        }
    }
}

#endif // os(tvOS)
