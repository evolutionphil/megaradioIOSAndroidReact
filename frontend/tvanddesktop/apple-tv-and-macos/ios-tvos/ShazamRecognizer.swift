// MegaRadio tvOS — ShazamKit integration
//
// Recognises the currently playing song from the live radio stream and
// surfaces it to the WebView via `window.__MR_SHAZAM_MATCH__({title, artist,
// artworkUrl})`. Falls back silently when ShazamKit can't identify the audio
// (talk shows, news, live broadcasts).
//
// Requires:
//   • tvOS 15+ (ShazamKit)
//   • Capability "ShazamKit" enabled in the main target
//   • Microphone entitlement NOT needed — we feed the decoded audio buffer
//     from the MegaRadio stream directly into SHSession.
//
// Usage from Swift:
//   ShazamRecognizer.shared.attach(to: webView)
//   ShazamRecognizer.shared.recognise(streamUrl: URL(string: station.streamUrl)!)

import Foundation
import AVFoundation
import WebKit

// ShazamKit is NOT available on tvOS (Apple platform restriction).
// On macOS / iOS / watchOS it works as expected.
#if !os(tvOS) && canImport(ShazamKit)
import ShazamKit

final class ShazamRecognizer: NSObject, SHSessionDelegate {

    static let shared = ShazamRecognizer()

    private let session = SHSession()
    private weak var webView: WKWebView?
    private var player: AVPlayer?
    private var tap: MTAudioProcessingTap?

    override init() { super.init(); session.delegate = self }

    func attach(to webView: WKWebView) { self.webView = webView }

    /// Starts listening on an active AVPlayer — call this when the user taps
    /// the Shazam "Recognise" button in the Now-Playing UI. We sample at most
    /// 12 seconds of audio then stop to conserve battery on Apple TV HD.
    func recognise(player: AVPlayer) {
        session.cancelActiveQuery()
        guard let item = player.currentItem,
              let track = item.asset.tracks(withMediaType: .audio).first else { return }

        let input = item.asset
        let reader = try? AVAssetReader(asset: input)
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsNonInterleaved: false,
        ]
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: settings)
        reader?.add(output)
        reader?.startReading()

        DispatchQueue.global(qos: .userInitiated).async {
            let deadline = Date().addingTimeInterval(12)
            while Date() < deadline, reader?.status == .reading, let buf = output.copyNextSampleBuffer() {
                self.session.matchStreamingBuffer(self.pcmBuffer(from: buf) ?? AVAudioPCMBuffer(),
                                                  at: nil)
            }
            reader?.cancelReading()
        }
    }

    // MARK: - SHSessionDelegate

    func session(_ session: SHSession, didFind match: SHMatch) {
        guard let item = match.mediaItems.first else { return }
        let dict: [String: String] = [
            "title":      item.title ?? "",
            "artist":     item.artist ?? "",
            "artworkUrl": item.artworkURL?.absoluteString ?? "",
        ]
        let json = (try? JSONSerialization.data(withJSONObject: dict)).flatMap {
            String(data: $0, encoding: .utf8)
        } ?? "{}"
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(
                "window.__MR_SHAZAM_MATCH__ && window.__MR_SHAZAM_MATCH__(\(json));",
                completionHandler: nil)
        }
    }

    func session(_ session: SHSession, didNotFindMatchFor signature: SHSignature, error: Error?) {
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(
                "window.__MR_SHAZAM_NOMATCH__ && window.__MR_SHAZAM_NOMATCH__();",
                completionHandler: nil)
        }
    }

    // MARK: - Helpers

    private func pcmBuffer(from cm: CMSampleBuffer) -> AVAudioPCMBuffer? {
        guard let fmtDesc = CMSampleBufferGetFormatDescription(cm),
              let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(fmtDesc)?.pointee,
              let format = AVAudioFormat(streamDescription: [asbd].withUnsafeBufferPointer { $0.baseAddress! }) else {
            return nil
        }
        let frames = AVAudioFrameCount(CMSampleBufferGetNumSamples(cm))
        guard let pcm = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { return nil }
        pcm.frameLength = frames
        CMSampleBufferCopyPCMDataIntoAudioBufferList(cm, at: 0,
            frameCount: Int32(frames), into: pcm.mutableAudioBufferList)
        return pcm
    }
}

#endif // !os(tvOS) && canImport(ShazamKit)
