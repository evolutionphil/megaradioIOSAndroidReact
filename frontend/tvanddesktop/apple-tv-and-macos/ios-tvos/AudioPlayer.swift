// AudioPlayer.swift — AVPlayer wrapper as an ObservableObject for SwiftUI.

import Foundation
import AVFoundation
import MediaPlayer
import Combine

@MainActor
final class AudioPlayer: ObservableObject {
    static let shared = AudioPlayer()

    @Published private(set) var currentStation: Station?
    @Published private(set) var isPlaying: Bool = false
    @Published private(set) var isBuffering: Bool = false
    @Published private(set) var lastError: String?
    @Published private(set) var nowPlayingTitle: String?
    @Published private(set) var nowPlayingArtist: String?

    private var player: AVPlayer?
    private var statusObserver: NSKeyValueObservation?
    private var rateObserver: NSKeyValueObservation?
    private var metadataOutput: AVPlayerItemMetadataOutput?

    private init() {
        configureRemoteCommands()
    }

    // ─────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────

    func play(_ station: Station) {
        guard let url = station.streamURL else {
            lastError = "This station has no stream URL"
            return
        }
        stop()
        currentStation = station
        nowPlayingTitle = nil
        nowPlayingArtist = nil
        isBuffering = true
        lastError = nil

        let item = AVPlayerItem(url: url)

        // ICY metadata
        let mdOutput = AVPlayerItemMetadataOutput(identifiers: nil)
        mdOutput.setDelegate(MetadataObserver.shared, queue: .main)
        item.add(mdOutput)
        self.metadataOutput = mdOutput

        let p = AVPlayer(playerItem: item)
        self.player = p

        statusObserver = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            Task { @MainActor in
                guard let self else { return }
                switch item.status {
                case .readyToPlay:
                    self.isBuffering = false
                case .failed:
                    self.isBuffering = false
                    self.isPlaying = false
                    self.lastError = item.error?.localizedDescription ?? "Playback error"
                default: break
                }
            }
        }
        rateObserver = p.observe(\.rate, options: [.new]) { [weak self] p, _ in
            Task { @MainActor in
                self?.isPlaying = p.rate > 0
            }
        }
        p.play()
        isPlaying = true
        updateNowPlayingInfo()
    }

    func togglePlayPause() {
        guard let p = player else {
            if let s = currentStation { play(s) }
            return
        }
        if p.rate > 0 { p.pause(); isPlaying = false }
        else { p.play(); isPlaying = true }
        updateNowPlayingInfo()
    }

    func stop() {
        player?.pause()
        player?.replaceCurrentItem(with: nil)
        player = nil
        statusObserver = nil
        rateObserver = nil
        metadataOutput = nil
        isPlaying = false
        isBuffering = false
    }

    // MARK: - ICY metadata callback

    fileprivate func handleMetadata(title: String?, artist: String?) {
        nowPlayingTitle = title
        nowPlayingArtist = artist
        updateNowPlayingInfo()
    }

    // ─────────────────────────────────────────────────────────────────
    // Now Playing Info (lock screen + Siri remote info)
    // ─────────────────────────────────────────────────────────────────

    private func updateNowPlayingInfo() {
        var info: [String: Any] = [:]
        let title = nowPlayingTitle ?? currentStation?.name ?? "MegaRadio"
        info[MPMediaItemPropertyTitle] = title
        info[MPMediaItemPropertyArtist] = nowPlayingArtist ?? currentStation?.country ?? ""
        info[MPMediaItemPropertyAlbumTitle] = currentStation?.tags ?? ""
        info[MPNowPlayingInfoPropertyIsLiveStream] = true
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func configureRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.togglePlayPause() }
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.togglePlayPause() }
            return .success
        }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            Task { @MainActor in self?.togglePlayPause() }
            return .success
        }
    }
}

// MARK: - ICY metadata observer

final class MetadataObserver: NSObject, AVPlayerItemMetadataOutputPushDelegate {
    static let shared = MetadataObserver()

    func metadataOutput(_ output: AVPlayerItemMetadataOutput,
                        didOutputTimedMetadataGroups groups: [AVTimedMetadataGroup],
                        from track: AVPlayerItemTrack?) {
        for group in groups {
            for item in group.items {
                // tvOS 16+ async load API. Capture the item locally because
                // `AVMetadataItem.load(.value)` is async-throwing.
                let mdItem = item
                Task {
                    let value = try? await mdItem.load(.value)
                    let raw = (value as? String) ?? ""
                    // ICY streams often deliver "Artist - Title"
                    let parts = raw.components(separatedBy: " - ")
                    let artist = parts.count > 1 ? parts[0] : nil
                    let title  = parts.count > 1
                        ? parts.dropFirst().joined(separator: " - ")
                        : raw
                    await MainActor.run {
                        AudioPlayer.shared.handleMetadata(
                            title: title.isEmpty ? nil : title,
                            artist: artist
                        )
                    }
                }
            }
        }
    }
}
