// GenresView.swift
// Genres list and genre stations views for Apple Watch

import SwiftUI

// MARK: - Main Genres View (Entry Point)
struct GenresView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 8) {
                    ForEach(appState.genres) { genre in
                        NavigationLink(destination: GenreStationsView(genre: genre)) {
                            ListRowButton(title: genre.name)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal, 8)
            }
            .navigationTitle("Turler")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.black)
        }
    }
}

// MARK: - Genre Stations View
struct GenreStationsView: View {
    @EnvironmentObject var appState: AppState
    let genre: Genre
    
    // Sample stations for the genre
    var stations: [Station] {
        [
            Station(id: "\(genre.id)_1", name: "Metro FM", country: "Turkiye", city: "Istanbul"),
            Station(id: "\(genre.id)_2", name: "Power Turk", country: "Turkiye", city: "Istanbul"),
            Station(id: "\(genre.id)_3", name: "Kral FM", country: "Turkiye", city: "Istanbul"),
            Station(id: "\(genre.id)_4", name: "Virgin Radio", country: "Turkiye", city: "Istanbul"),
        ]
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                ForEach(stations) { station in
                    NavigationLink(destination: NowPlayingView(station: station)) {
                        StationRowButton(title: station.name)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.horizontal, 8)
        }
        .navigationTitle(genre.name)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.black)
    }
}

// MARK: - Reusable Components

struct ListRowButton: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.gray)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(white: 0.15))
        .cornerRadius(8)
    }
}

struct StationRowButton: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
            
            Image(systemName: "play.circle")
                .font(.system(size: 16))
                .foregroundColor(Color("AccentPink"))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(white: 0.15))
        .cornerRadius(8)
    }
}

#Preview {
    GenresView()
        .environmentObject(AppState())
}
