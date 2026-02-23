// NowPlayingView.swift
// Shows currently playing station on Apple Watch

import SwiftUI

struct NowPlayingView: View {
    @EnvironmentObject var appState: AppState
    var station: Station? = nil
    
    private var displayStation: Station? {
        station ?? appState.currentStation
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Station Logo
                if let logoUrl = displayStation?.logoUrl,
                   let url = URL(string: logoUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        radioPlaceholder
                    }
                    .frame(width: 70, height: 70)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                } else {
                    radioPlaceholder
                }
                
                // Station Name
                Text(displayStation?.name ?? "Radyo Secilmedi")
                    .font(.system(size: 16, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .foregroundColor(.white)
                
                // Now Playing Info
                if let nowPlaying = appState.nowPlaying {
                    VStack(spacing: 2) {
                        if let title = nowPlaying.title {
                            Text(title)
                                .font(.system(size: 13))
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                        }
                        
                        if let artist = nowPlaying.artist {
                            Text(artist)
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                }
                
                // Playback Controls
                HStack(spacing: 16) {
                    // Previous
                    Button(action: {
                        WatchConnectivityService.shared.sendCommand(.previous)
                    }) {
                        Image(systemName: "backward.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                    
                    // Play/Pause
                    Button(action: {
                        appState.togglePlayPause()
                    }) {
                        Image(systemName: appState.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(Color("AccentPink"))
                    }
                    .buttonStyle(.plain)
                    
                    // Next
                    Button(action: {
                        WatchConnectivityService.shared.sendCommand(.next)
                    }) {
                        Image(systemName: "forward.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 8)
                
                // Volume Control
                VStack(spacing: 4) {
                    HStack(spacing: 6) {
                        Image(systemName: "speaker.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                        
                        Slider(value: Binding(
                            get: { appState.volume },
                            set: { WatchConnectivityService.shared.setVolume($0) }
                        ), in: 0...1)
                        .tint(Color("AccentPink"))
                        
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 12)
        }
        .background(Color.black)
        .onAppear {
            // If a station was passed, play it
            if let station = station {
                appState.playStation(station)
            }
        }
    }
    
    private var radioPlaceholder: some View {
        Image(systemName: "radio")
            .font(.system(size: 30))
            .foregroundColor(.gray)
            .frame(width: 70, height: 70)
            .background(Color(white: 0.15))
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

#Preview {
    NowPlayingView()
        .environmentObject(AppState())
}
