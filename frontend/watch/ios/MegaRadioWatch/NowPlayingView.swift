// NowPlayingView.swift
// Now Playing screen with playback controls

import SwiftUI

// MARK: - Now Playing View
struct NowPlayingView: View {
    @EnvironmentObject var appState: AppState
    let station: Station
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Station Logo
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.purple.opacity(0.8))
                        .frame(width: 80, height: 80)
                    
                    // Placeholder logo - in real app, load from URL
                    Text(String(station.name.prefix(2)).uppercased())
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                }
                
                // Station Info
                VStack(spacing: 4) {
                    Text(station.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                    
                    Text(station.locationText)
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                    .frame(height: 8)
                
                // Playback Controls
                HStack(spacing: 20) {
                    // Previous Button
                    Button(action: {
                        appState.previousStation()
                    }) {
                        ZStack {
                            Ellipse()
                                .fill(Color(white: 0.25))
                                .frame(width: 44, height: 40)
                            
                            Image(systemName: "backward.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.white)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Play/Pause Button
                    Button(action: {
                        appState.togglePlayPause()
                    }) {
                        ZStack {
                            Ellipse()
                                .fill(Color(white: 0.25))
                                .frame(width: 56, height: 50)
                            
                            Image(systemName: appState.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.white)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Next Button
                    Button(action: {
                        appState.nextStation()
                    }) {
                        ZStack {
                            Ellipse()
                                .fill(Color(white: 0.25))
                                .frame(width: 44, height: 40)
                            
                            Image(systemName: "forward.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.white)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.top, 10)
            .padding(.horizontal)
        }
        .navigationTitle(station.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(station.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color("AccentPink"))
                    .lineLimit(1)
            }
        }
        .background(Color.black)
        .onAppear {
            appState.playStation(station)
        }
    }
}

#Preview {
    NavigationStack {
        NowPlayingView(station: Station(
            id: "1",
            name: "Metro FM",
            country: "Turkey",
            city: "Istanbul",
            logoUrl: nil
        ))
    }
    .environmentObject(AppState())
}
