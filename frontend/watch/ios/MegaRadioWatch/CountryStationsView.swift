// CountryStationsView.swift
// Shows stations within a country on Apple Watch

import SwiftUI

struct CountryStationsView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    let country: WatchCountry
    
    var body: some View {
        Group {
            if sessionManager.isLoadingCountryStations {
                // Loading state
                VStack(spacing: 8) {
                    ProgressView()
                        .tint(.pink)
                    
                    Text("Istasyonlar yukleniyor...")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                .padding()
            } else if sessionManager.countryStations.isEmpty {
                // Empty state
                VStack(spacing: 8) {
                    Image(systemName: "radio")
                        .font(.system(size: 28))
                        .foregroundColor(.gray)
                    
                    Text("Istasyon bulunamadi")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white)
                    
                    Button(action: {
                        sessionManager.requestCountryStations(countryName: country.name)
                    }) {
                        Text("Tekrar Dene")
                            .font(.system(size: 11))
                    }
                    .padding(.top, 4)
                }
                .padding()
            } else {
                // Stations list
                List(sessionManager.countryStations) { station in
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
                                
                                if let genre = station.genre, !genre.isEmpty {
                                    Text(genre)
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
        .navigationTitle(country.name)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            sessionManager.requestCountryStations(countryName: country.name)
        }
    }
}

#Preview {
    CountryStationsView(country: WatchCountry(name: "Turkey", code: "TR", flag: "🇹🇷", stationCount: 150))
        .environmentObject(WatchSessionManager.shared)
}
