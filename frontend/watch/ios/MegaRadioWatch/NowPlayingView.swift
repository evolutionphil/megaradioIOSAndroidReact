// NowPlayingView.swift
// Shows currently playing station on Apple Watch

import SwiftUI

struct NowPlayingView: View {
    @State private var isPlaying = false
    @State private var stationName = "MegaRadio"
    @State private var nowPlayingTitle = "Radyo Dinle"
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Station Logo Placeholder
                Image(systemName: "radio")
                    .font(.system(size: 40))
                    .foregroundColor(.pink)
                    .frame(width: 80, height: 80)
                    .background(Color.gray.opacity(0.2))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                
                // Station Name
                Text(stationName)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                // Now Playing Info
                Text(nowPlayingTitle)
                    .font(.system(size: 12))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                
                // Playback Controls
                HStack(spacing: 20) {
                    Button(action: {}) {
                        Image(systemName: "backward.fill")
                            .font(.system(size: 20))
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: { isPlaying.toggle() }) {
                        Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 44))
                            .foregroundColor(.pink)
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: {}) {
                        Image(systemName: "forward.fill")
                            .font(.system(size: 20))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 8)
            }
            .padding()
        }
    }
}

#Preview {
    NowPlayingView()
}
