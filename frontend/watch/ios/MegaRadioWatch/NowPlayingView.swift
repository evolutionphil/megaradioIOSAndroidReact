// NowPlayingView.swift
// Shows currently playing station on Apple Watch - Connected to iOS app

import SwiftUI

struct NowPlayingView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    var body: some View {
        VStack(spacing: 8) {
            // Connection Status (show if not connected at all)
            if !sessionManager.isConnected {
                HStack {
                    Image(systemName: "iphone.slash")
                        .font(.system(size: 10))
                    Text("iPhone baglantisi yok")
                        .font(.system(size: 9))
                }
                .foregroundColor(.red)
            } else if !sessionManager.isReachable {
                HStack {
                    Image(systemName: "iphone.gen3")
                        .font(.system(size: 10))
                    Text("iPhone arka planda")
                        .font(.system(size: 9))
                }
                .foregroundColor(.orange)
            }
            
            Spacer()
            
            // Station Logo
            AsyncImage(url: URL(string: sessionManager.nowPlaying.stationLogo ?? "")) { phase in
                switch phase {
                case .empty:
                    Image(systemName: "radio")
                        .font(.system(size: 36))
                        .foregroundColor(.pink)
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                case .failure:
                    Image(systemName: "radio")
                        .font(.system(size: 36))
                        .foregroundColor(.pink)
                @unknown default:
                    Image(systemName: "radio")
                        .font(.system(size: 36))
                        .foregroundColor(.pink)
                }
            }
            .frame(width: 60, height: 60)
            .background(Color.gray.opacity(0.2))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            
            // Station Name
            Text(sessionManager.nowPlaying.stationName ?? "Radyo Seçin")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
                .lineLimit(2)
            
            // Now Playing Info (Song/Artist)
            if let songTitle = sessionManager.nowPlaying.songTitle, !songTitle.isEmpty {
                VStack(spacing: 1) {
                    Text(songTitle)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    if let artist = sessionManager.nowPlaying.artistName, !artist.isEmpty {
                        Text(artist)
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                            .lineLimit(1)
                    }
                }
            }
            
            Spacer()
            
            // Playback Controls
            HStack(spacing: 16) {
                // Previous Station
                Button(action: {
                    sessionManager.sendPreviousStation()
                }) {
                    ZStack {
                        Circle()
                            .fill(Color(white: 0.22))
                            .frame(width: 48, height: 48)
                        
                        Image(systemName: "backward.end.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(.plain)
                
                // Play/Pause
                Button(action: {
                    sessionManager.sendTogglePlayPause()
                }) {
                    ZStack {
                        Circle()
                            .fill(Color(white: 0.22))
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: sessionManager.nowPlaying.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(.plain)
                
                // Next Station
                Button(action: {
                    sessionManager.sendNextStation()
                }) {
                    ZStack {
                        Circle()
                            .fill(Color(white: 0.22))
                            .frame(width: 48, height: 48)
                        
                        Image(systemName: "forward.end.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(.plain)
            }
            
            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .onAppear {
            sessionManager.requestNowPlaying()
        }
    }
}

#Preview {
    NowPlayingView()
        .environmentObject(WatchSessionManager.shared)
}
