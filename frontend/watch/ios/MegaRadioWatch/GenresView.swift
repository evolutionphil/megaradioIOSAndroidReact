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
        case let n where n.contains("folk"):
            return "music.mic"
        case let n where n.contains("ambient"), let n where n.contains("chill"):
            return "cloud"
        case let n where n.contains("blues"):
            return "music.note.list"
        case let n where n.contains("funk"):
            return "waveform.path.ecg"
        default:
            return "radio"
        }
    }
    
    var body: some View {
        NavigationStack {
            Group {
                if sessionManager.genres.isEmpty {
                    // Empty state
                    VStack(spacing: 8) {
                        if !sessionManager.isReachable {
                            Image(systemName: "iphone.slash")
                                .font(.system(size: 28))
                                .foregroundColor(.orange)
                            
                            Text("iPhone'a baglan")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white)
                            
                            Text("Turleri gormek icin iPhone'da MegaRadio acik olmali")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        } else {
                            ProgressView()
                                .tint(.pink)
                            
                            Text("Turler yukleniyor...")
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                        }
                        
                        Button(action: {
                            sessionManager.requestGenres()
                        }) {
                            Text("Yenile")
                                .font(.system(size: 11))
                        }
                        .padding(.top, 8)
                    }
                    .padding()
                } else {
                    // Genres list - tappable with NavigationLink
                    List(sessionManager.genres) { genre in
                        NavigationLink(destination: GenreStationsView(genre: genre)
                            .environmentObject(sessionManager)) {
                            HStack(spacing: 10) {
                                Image(systemName: iconForGenre(genre.name))
                                    .foregroundColor(.pink)
                                    .frame(width: 20)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(genre.name)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.white)
                                    
                                    Text("\(genre.stationCount) istasyon")
                                        .font(.system(size: 9))
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
            .navigationTitle("Turler")
            .navigationBarTitleDisplayMode(.inline)
        }
        .onAppear {
            sessionManager.requestGenres()
        }
    }
}

#Preview {
    GenresView()
        .environmentObject(WatchSessionManager.shared)
}
