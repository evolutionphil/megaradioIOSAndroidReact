// NowPlayingView.swift
// Shows currently playing station on Apple Watch - Connected to iOS app

import SwiftUI

struct NowPlayingView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    var body: some View {
        VStack(spacing: 8) {
            // Connection Status (only show if not connected)
            if !sessionManager.isReachable {
                HStack {
                    Image(systemName: "iphone.slash")
                        .font(.system(size: 10))
                    Text("iPhone bağlantısı yok")
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
            HStack(spacing: 24) {
                // Previous Station
                Button(action: {
                    sessionManager.sendPreviousStation()
                }) {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white)
                }
                .buttonStyle(.plain)
                
                // Play/Pause
                Button(action: {
                    sessionManager.sendTogglePlayPause()
                }) {
                    Image(systemName: sessionManager.nowPlaying.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.pink)
                }
                .buttonStyle(.plain)
                
                // Next Station
                Button(action: {
                    sessionManager.sendNextStation()
                }) {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white)
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
