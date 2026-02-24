// NowPlayingView.swift
// Shows currently playing station on Apple Watch - Connected to iOS app

import SwiftUI

struct NowPlayingView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Connection Status (only show if not connected)
                if !sessionManager.isReachable {
                    HStack {
                        Image(systemName: "iphone.slash")
                            .font(.system(size: 12))
                        Text("iPhone bağlantısı yok")
                            .font(.system(size: 10))
                    }
                    .foregroundColor(.orange)
                    .padding(.bottom, 4)
                }
                
                // Station Logo
                AsyncImage(url: URL(string: sessionManager.nowPlaying.stationLogo ?? "")) { phase in
                    switch phase {
                    case .empty:
                        Image(systemName: "radio")
                            .font(.system(size: 40))
                            .foregroundColor(.pink)
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    case .failure:
                        Image(systemName: "radio")
                            .font(.system(size: 40))
                            .foregroundColor(.pink)
                    @unknown default:
                        Image(systemName: "radio")
                            .font(.system(size: 40))
                            .foregroundColor(.pink)
                    }
                }
                .frame(width: 80, height: 80)
                .background(Color.gray.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                // Station Name
                Text(sessionManager.nowPlaying.stationName ?? "Radyo Seçin")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                
                // Now Playing Info (Song/Artist)
                if let songTitle = sessionManager.nowPlaying.songTitle {
                    VStack(spacing: 2) {
                        Text(songTitle)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .lineLimit(1)
                        
                        if let artist = sessionManager.nowPlaying.artistName {
                            Text(artist)
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                                .lineLimit(1)
                        }
                    }
                } else {
                    Text("Canlı Radyo")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                
                // Playback Controls
                HStack(spacing: 20) {
                    // Previous Station
                    Button(action: {
                        sessionManager.sendPreviousStation()
                    }) {
                        Image(systemName: "backward.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                    
                    // Play/Pause
                    Button(action: {
                        sessionManager.sendTogglePlayPause()
                    }) {
                        Image(systemName: sessionManager.nowPlaying.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 44))
                            .foregroundColor(.pink)
                    }
                    .buttonStyle(.plain)
                    
                    // Next Station
                    Button(action: {
                        sessionManager.sendNextStation()
                    }) {
                        Image(systemName: "forward.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 8)
            }
            .padding()
        }
        .onAppear {
            sessionManager.requestNowPlaying()
        }
    }
}

#Preview {
    NowPlayingView()
        .environmentObject(WatchSessionManager.shared)
}
