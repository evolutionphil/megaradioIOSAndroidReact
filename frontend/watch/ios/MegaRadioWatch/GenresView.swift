// GenresView.swift
// Genres list view for Apple Watch - Connected to iOS app

import SwiftUI

struct GenresView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    // System icons for common genres
    private func iconForGenre(_ name: String) -> String {
        let lowercased = name.lowercased()
        switch lowercased {
        case let n where n.contains("pop"):
            return "music.note"
        case let n where n.contains("rock"):
            return "guitars"
        case let n where n.contains("jazz"):
            return "pianokeys"
        case let n where n.contains("klasik"), let n where n.contains("classic"):
            return "music.quarternote.3"
        case let n where n.contains("haber"), let n where n.contains("news"):
            return "newspaper"
        case let n where n.contains("spor"), let n where n.contains("sport"):
            return "sportscourt"
        case let n where n.contains("hip"), let n where n.contains("rap"):
            return "beats.headphones"
        case let n where n.contains("electronic"), let n where n.contains("dance"):
            return "waveform"
        case let n where n.contains("country"):
            return "leaf"
        case let n where n.contains("r&b"), let n where n.contains("soul"):
            return "heart.fill"
        case let n where n.contains("latin"):
            return "sun.max"
        case let n where n.contains("reggae"):
            return "sun.haze"
        case let n where n.contains("metal"):
            return "bolt.fill"
        case let n where n.contains("indie"), let n where n.contains("alternative"):
            return "sparkles"
        case let n where n.contains("talk"), let n where n.contains("podcast"):
            return "mic"
        case let n where n.contains("religious"), let n where n.contains("dini"):
            return "moon.stars"
        default:
            return "radio"
        }
    }
    
    var body: some View {
        NavigationStack {
            Group {
                if sessionManager.genres.isEmpty {
                    // Empty state
                    VStack(spacing: 12) {
                        Image(systemName: "music.note.list")
                            .font(.system(size: 36))
                            .foregroundColor(.gray)
                        
                        Text("Türler yükleniyor...")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                        
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
                        
                        Button(action: {
                            sessionManager.requestGenres()
                        }) {
                            Text("Yenile")
                                .font(.system(size: 12))
                        }
                        .padding(.top, 4)
                    }
                    .padding()
                } else {
                    // Genres list
                    List(sessionManager.genres) { genre in
                        NavigationLink(destination: GenreDetailView(genre: genre)) {
                            HStack(spacing: 10) {
                                Image(systemName: iconForGenre(genre.name))
                                    .foregroundColor(.pink)
                                    .frame(width: 24)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(genre.name)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(.white)
                                    
                                    Text("\(genre.stationCount) istasyon")
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                }
                                
                                Spacer()
                            }
                        }
                        .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Türler")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            sessionManager.requestGenres()
        }
    }
}

// MARK: - Genre Detail View (placeholder for future implementation)
struct GenreDetailView: View {
    let genre: WatchGenre
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "radio.fill")
                .font(.system(size: 40))
                .foregroundColor(.pink)
            
            Text(genre.name)
                .font(.system(size: 16, weight: .semibold))
            
            Text("\(genre.stationCount) istasyon")
                .font(.system(size: 12))
                .foregroundColor(.gray)
            
            Text("iPhone'dan dinleyin")
                .font(.system(size: 11))
                .foregroundColor(.gray)
                .padding(.top, 8)
        }
        .padding()
        .navigationTitle(genre.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    GenresView()
        .environmentObject(WatchSessionManager.shared)
}
