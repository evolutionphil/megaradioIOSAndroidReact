// GenresView.swift
// Genres list and genre stations views

import SwiftUI

// MARK: - Genres List View
struct GenresListView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                ForEach(appState.genres) { genre in
                    NavigationLink(destination: GenreStationsView(genre: genre)) {
                        ListRowButton(title: genre.name)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.horizontal)
        }
        .navigationTitle("Genres")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("Genres")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color("AccentPink"))
            }
        }
        .background(Color.black)
    }
}

// MARK: - Genre Stations View
struct GenreStationsView: View {
    @EnvironmentObject var appState: AppState
    let genre: Genre
    
    // Mock stations for the genre
    var stations: [Station] {
        [
            Station(id: "1", name: "Metro FM", country: "Turkey", city: "Istanbul", logoUrl: nil),
            Station(id: "2", name: "Power Türk", country: "Turkey", city: "Istanbul", logoUrl: nil),
            Station(id: "3", name: "CNN Türk", country: "Turkey", city: "Ankara", logoUrl: nil),
            Station(id: "4", name: "Kral FM", country: "Turkey", city: "Istanbul", logoUrl: nil),
        ]
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                ForEach(stations) { station in
                    NavigationLink(destination: NowPlayingView(station: station)) {
                        StationRowButton(title: station.name)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .simultaneousGesture(TapGesture().onEnded {
                        appState.playStation(station)
                    })
                }
            }
            .padding(.horizontal)
        }
        .navigationTitle(genre.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(genre.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color("AccentPink"))
            }
        }
        .background(Color.black)
    }
}

// MARK: - List Row Button Component
struct ListRowButton: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.gray)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color(white: 0.15))
        .cornerRadius(10)
    }
}

// MARK: - Station Row Button Component
struct StationRowButton: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color(white: 0.15))
        .cornerRadius(10)
    }
}

#Preview {
    NavigationStack {
        GenresListView()
    }
    .environmentObject(AppState())
}
