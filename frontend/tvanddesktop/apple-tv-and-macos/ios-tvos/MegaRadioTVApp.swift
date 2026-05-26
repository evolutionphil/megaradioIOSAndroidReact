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

#if os(tvOS)

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
        // JS bridge — `window.webkit.messageHandlers.continueListening.postMessage([...])`
        cfg.userContentController.add(context.coordinator, name: "continueListening")
        // JS bridge — `window.webkit.messageHandlers.megaradio.postMessage({id, fn, args})`
        // Used by `src/lib/nativeIap.ts` for StoreKit 2 in-app purchases.
        cfg.userContentController.add(context.coordinator, name: "megaradio")
        // Tell the web layer "we're Apple TV — render PremiumUpgradeNative instead of the QR screen".
        let platformScript = WKUserScript(
            source: "window.MegaRadioPlatform = { platform: 'appletv' };",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true)
        cfg.userContentController.addUserScript(platformScript)

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

    /// Holds the WebView reference + receives JS bridge messages. When the
    /// web layer pushes its "Continue Listening" list we persist it into the
    /// shared App Group so the Top Shelf extension can render it.
    final class Coord: NSObject, WKScriptMessageHandler {
        weak var webView: WKWebView?

        func userContentController(_ controller: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            // ──────────────────────────────────────────────────────────────
            // Channel 1: "continueListening" — Top Shelf data persistence.
            // ──────────────────────────────────────────────────────────────
            if message.name == "continueListening",
               let arr = message.body as? [[String: Any]] {
                guard let defaults = UserDefaults(suiteName: "group.com.visiongo.megaradio") else { return }
                let mapped: [[String: String]] = arr.compactMap { dict in
                    guard let id = dict["id"] as? String, !id.isEmpty,
                          let name = dict["name"] as? String, !name.isEmpty else { return nil }
                    return [
                        "id":        id,
                        "name":      name,
                        "genre":     (dict["genre"] as? String) ?? "",
                        "streamUrl": (dict["streamUrl"] as? String) ?? "",
                        "iconUrl":   (dict["iconUrl"] as? String) ?? "",
                    ]
                }
                if let data = try? JSONSerialization.data(withJSONObject: mapped) {
                    defaults.set(data, forKey: "continue_listening_v1")
                }
                return
            }

            // ──────────────────────────────────────────────────────────────
            // Channel 2: "megaradio" — StoreKit 2 IAP RPC bridge.
            // Body shape: { id: String, fn: String, args: [String:Any] }
            // ──────────────────────────────────────────────────────────────
            if message.name == "megaradio",
               let body = message.body as? [String: Any],
               let id = body["id"] as? String,
               let fn = body["fn"] as? String {
                let args = body["args"] as? [String: Any] ?? [:]
                Task { @MainActor in
                    do {
                        // Pull the latest auth token from JS-set globals if available.
                        if let token = args["__authToken"] as? String {
                            StoreKitIapService.shared.authToken = token
                        }
                        let payload: Any
                        switch fn {
                        case "getProducts":
                            payload = try await StoreKitIapService.shared.getProducts()
                        case "purchaseProduct":
                            let pid = (args["productId"] as? String) ?? ""
                            payload = try await StoreKitIapService.shared.purchase(productId: pid)
                        case "restorePurchases":
                            payload = try await StoreKitIapService.shared.restore()
                        case "manageSubscriptions":
                            try await StoreKitIapService.shared.openManageSubscriptions()
                            payload = ["ok": true]
                        case "setAuthToken":
                            StoreKitIapService.shared.authToken = (args["token"] as? String)
                            payload = ["ok": true]
                        default:
                            payload = ["error": "Unknown fn: \(fn)"]
                        }
                        await self.resolveBridge(id: id, payload: payload)
                    } catch {
                        await self.resolveBridge(id: id, payload: ["error": error.localizedDescription])
                    }
                }
                return
            }
        }

        @MainActor
        private func resolveBridge(id: String, payload: Any) async {
            guard let webView else { return }
            let json: String
            if let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
               let str = String(data: data, encoding: .utf8) {
                json = str
            } else {
                json = "null"
            }
            // Escape single quotes in the id (defensive; ids are server-generated).
            let safeId = id.replacingOccurrences(of: "'", with: "\\'")
            let js = "window.MegaRadioBridge && window.MegaRadioBridge.__resolveIap && window.MegaRadioBridge.__resolveIap('\(safeId)', \(json));"
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }
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

#endif // os(tvOS)
