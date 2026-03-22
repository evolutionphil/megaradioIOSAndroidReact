// GenreStationsView.swift
// Shows stations within a genre on Apple Watch

import SwiftUI

struct GenreStationsView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    let genre: WatchGenre
    
    var body: some View {
        Group {
            if sessionManager.isLoadingGenreStations {
                // Loading state
                VStack(spacing: 8) {
                    ProgressView()
                        .tint(.pink)
                    
                    Text("Istasyonlar yukleniyor...")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                .padding()
            } else if sessionManager.genreStations.isEmpty {
                // Empty state
                VStack(spacing: 8) {
                    Image(systemName: "radio")
                        .font(.system(size: 28))
                        .foregroundColor(.gray)
                    
                    Text("Istasyon bulunamadi")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white)
                    
                    Button(action: {
                        sessionManager.requestGenreStations(slug: genre.resolvedSlug)
                    }) {
                        Text("Tekrar Dene")
                            .font(.system(size: 11))
                    }
                    .padding(.top, 4)
                }
                .padding()
            } else {
                // Stations list
                List(sessionManager.genreStations) { station in
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
                            .frame(width: 30, height: 30)
                            .background(Color.gray.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                            
                            // Station Name
                            VStack(alignment: .leading, spacing: 2) {
                                Text(station.name)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                
                                if let country = station.country, !country.isEmpty {
                                    Text(country)
                                        .font(.system(size: 9))
                                        .foregroundColor(.gray)
                                        .lineLimit(1)
                                }
                            }
                            
                            Spacer()
                            
                            // Play indicator if currently playing
                            if sessionManager.nowPlaying.stationId == station.id {
                                Image(systemName: sessionManager.nowPlaying.isPlaying ? "speaker.wave.2.fill" : "speaker.fill")
                                    .foregroundColor(.pink)
                                    .font(.system(size: 11))
                            } else {
                                Image(systemName: "play.circle")
                                    .foregroundColor(.gray)
                                    .font(.system(size: 13))
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(Color.clear)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle(genre.name)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            // Request stations for this genre from iPhone
            sessionManager.requestGenreStations(slug: genre.resolvedSlug)
        }
    }
}

#Preview {
    GenreStationsView(genre: WatchGenre(name: "Rock", slug: "rock", icon: "guitars", stationCount: 50))
        .environmentObject(WatchSessionManager.shared)
}
