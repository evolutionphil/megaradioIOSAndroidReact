// NowPlayingView.swift
// Shows currently playing station on Apple Watch

import SwiftUI

struct NowPlayingView: View {
    @EnvironmentObject var connectivityService: WatchConnectivityService
    @State private var isPlaying = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Station Logo
                if let logoUrl = connectivityService.currentStation?.logoUrl,
                   let url = URL(string: logoUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Image(systemName: "radio")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    Image(systemName: "radio")
                        .font(.system(size: 40))
                        .foregroundColor(.gray)
                        .frame(width: 80, height: 80)
                        .background(Color.gray.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                
                // Station Name
                Text(connectivityService.currentStation?.name ?? "Radyo Seçilmedi")
                    .font(.headline)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                
                // Now Playing Info
                if let nowPlaying = connectivityService.nowPlaying {
                    VStack(spacing: 4) {
                        Text(nowPlaying.title ?? "")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.center)
                            .lineLimit(2)
                        
                        if let artist = nowPlaying.artist {
                            Text(artist)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                }
                
                // Playback Controls
                HStack(spacing: 20) {
                    // Previous
                    Button(action: {
                        connectivityService.sendCommand(.previous)
                    }) {
                        Image(systemName: "backward.fill")
                            .font(.title2)
                    }
                    .buttonStyle(.plain)
                    
                    // Play/Pause
                    Button(action: {
                        isPlaying.toggle()
                        connectivityService.sendCommand(isPlaying ? .play : .pause)
                    }) {
                        Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 44))
                            .foregroundColor(.pink)
                    }
                    .buttonStyle(.plain)
                    
                    // Next
                    Button(action: {
                        connectivityService.sendCommand(.next)
                    }) {
                        Image(systemName: "forward.fill")
                            .font(.title2)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 8)
                
                // Volume Control
                VStack(spacing: 4) {
                    HStack {
                        Image(systemName: "speaker.fill")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Slider(value: Binding(
                            get: { connectivityService.volume },
                            set: { connectivityService.setVolume($0) }
                        ), in: 0...1)
                        
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal)
            }
            .padding()
        }
        .navigationTitle("Çalıyor")
        .onReceive(connectivityService.$isPlaying) { playing in
            isPlaying = playing
        }
    }
}

#Preview {
    NowPlayingView()
        .environmentObject(WatchConnectivityService())
}
