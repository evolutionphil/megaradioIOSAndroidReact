// FavoritesView.swift
// Favorites list view for Apple Watch - Connected to iOS app

import SwiftUI

struct FavoritesView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    var body: some View {
        NavigationStack {
            Group {
                if sessionManager.favorites.isEmpty {
                    // Empty state
                    VStack(spacing: 12) {
                        Image(systemName: "heart.slash")
                            .font(.system(size: 36))
                            .foregroundColor(.gray)
                        
                        Text("Favori yok")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                        
                        Text("iPhone'dan favori ekleyin")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                        
                        if !sessionManager.isReachable {
                            HStack {
                                Image(systemName: "iphone.slash")
                                    .font(.system(size: 10))
                                Text("iPhone bağlı değil")
                                    .font(.system(size: 10))
                            }
                            .foregroundColor(.orange)
                            .padding(.top, 8)
                        }
                    }
                    .padding()
                } else {
                    // Favorites list
                    List(sessionManager.favorites) { station in
                        Button(action: {
                            sessionManager.playStation(id: station.id)
                        }) {
                            HStack(spacing: 10) {
                                // Station Logo
                                AsyncImage(url: URL(string: station.logo ?? "")) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    default:
                                        Image(systemName: "radio")
                                            .foregroundColor(.pink)
                                    }
                                }
                                .frame(width: 32, height: 32)
                                .background(Color.gray.opacity(0.2))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                                
                                // Station Name
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(station.name)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(.white)
                                        .lineLimit(1)
                                    
                                    if let genre = station.genre {
                                        Text(genre)
                                            .font(.system(size: 10))
                                            .foregroundColor(.gray)
                                            .lineLimit(1)
                                    }
                                }
                                
                                Spacer()
                                
                                // Play indicator if currently playing
                                if sessionManager.nowPlaying.stationId == station.id {
                                    Image(systemName: sessionManager.nowPlaying.isPlaying ? "speaker.wave.2.fill" : "speaker.fill")
                                        .foregroundColor(.pink)
                                        .font(.system(size: 12))
                                } else {
                                    Image(systemName: "play.circle")
                                        .foregroundColor(.gray)
                                        .font(.system(size: 14))
                                }
                            }
                        }
                        .buttonStyle(.plain)
                        .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Favoriler")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            sessionManager.requestFavorites()
        }
    }
}

#Preview {
    FavoritesView()
        .environmentObject(WatchSessionManager.shared)
}
