// MegaRadioTV — tvOS native shell (Faz 1B)
//
// Loads the shared MegaRadio web-preview bundle inside a fullscreen WKWebView
// and bridges the Siri remote to synthetic DOM keyboard events so the
// existing spatial-nav JS engine (the same one running on Samsung Tizen /
// webOS / Android TV) can handle focus management unchanged.
//
// Setup (on a Mac):
//   1.  Xcode 16+ → File → New → Project → tvOS → App (Swift, SwiftUI)
//   2.  Target tvOS 17,  Bundle `com.visiongo.megaradio`
//   3.  Replace the generated `ContentView.swift` with this file
//   4.  Copy the MegaRadio brand logo into `Assets.xcassets` as
//       `AppIcon` (Large and Small) and `TopShelfImage` (1920×720)
//   5.  Capabilities → Background Modes → Audio, AirPlay, PiP
//   6.  ⌘R to run in the tvOS simulator or to an Apple TV device

import SwiftUI
import WebKit
import AVKit

@main
struct MegaRadioTVApp: App {
    init() {
        // So background audio continues when the app loses focus.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
    }
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

struct ContentView: View {
    var body: some View {
        WebViewHost()
            .ignoresSafeArea()
            .background(Color(red: 0x0E/255, green: 0x0E/255, blue: 0x0E/255))
    }
}

/// SwiftUI wrapper around the WKWebView + a transparent focusable view that
/// listens to Siri-remote presses and forwards them into the page.
struct WebViewHost: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let container = UIView()
        container.backgroundColor = UIColor(red: 0x0E/255, green: 0x0E/255, blue: 0x0E/255, alpha: 1)

        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: cfg)
        webView.scrollView.isScrollEnabled = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.customUserAgent = (webView.value(forKey: "userAgent") as? String ?? "") + " MegaRadioTVOS/1.0"
        webView.load(URLRequest(url: URL(string: "https://themegaradio.com/tv")!))

        container.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            webView.topAnchor.constraint(equalTo: container.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])

        // Focusable overlay so the Siri remote talks to us, not tvOS chrome.
        let focus = RemoteFocusView(webView: webView)
        focus.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(focus)
        NSLayoutConstraint.activate([
            focus.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            focus.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            focus.topAnchor.constraint(equalTo: container.topAnchor),
            focus.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])
        context.coordinator.webView = webView
        return container
    }
    func updateUIView(_ uiView: UIView, context: Context) {}
    func makeCoordinator() -> Coord { Coord() }
    final class Coord { weak var webView: WKWebView? }
}

/// Transparent focus target. `canBecomeFocused = true` lets us receive
/// `pressesBegan(_:)` for the Siri remote so we can fire synthetic DOM
/// KeyboardEvents into the web layer.
final class RemoteFocusView: UIView {
    weak var webView: WKWebView?
    init(webView: WKWebView) {
        self.webView = webView
        super.init(frame: .zero)
        backgroundColor = .clear
        isUserInteractionEnabled = true
    }
    required init?(coder: NSCoder) { fatalError() }

    override var canBecomeFocused: Bool { true }

    override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        for press in presses {
            switch press.type {
            case .upArrow:      dispatch(keyCode: 38, key: "ArrowUp")
            case .downArrow:    dispatch(keyCode: 40, key: "ArrowDown")
            case .leftArrow:    dispatch(keyCode: 37, key: "ArrowLeft")
            case .rightArrow:   dispatch(keyCode: 39, key: "ArrowRight")
            case .select:       dispatch(keyCode: 13, key: "Enter")
            case .menu:         dispatch(keyCode: 27, key: "Escape")   // Siri "Back" → ESC
            case .playPause:    dispatch(keyCode: 179, key: "MediaPlayPause")
            default:            super.pressesBegan(presses, with: event)
            }
        }
    }

    private func dispatch(keyCode: Int, key: String) {
        guard let webView else { return }
        let js = """
        (function(){
          var e=new KeyboardEvent('keydown',{keyCode:\(keyCode),which:\(keyCode),key:'\(key)',bubbles:true,cancelable:true});
          document.dispatchEvent(e);
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
