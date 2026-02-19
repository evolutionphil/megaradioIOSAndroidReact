// FavoritesView.swift
// Favorites list view

import SwiftUI

// MARK: - Favorites View
struct FavoritesView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if appState.favorites.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "heart.slash")
                            .font(.system(size: 30))
                            .foregroundColor(.gray)
                        
                        Text("No favorites yet")
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                    }
                    .padding(.top, 40)
                } else {
                    ForEach(appState.favorites) { station in
                        NavigationLink(destination: NowPlayingView(station: station)) {
                            StationRowButton(title: station.name)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .simultaneousGesture(TapGesture().onEnded {
                            appState.playStation(station)
                        })
                    }
                }
            }
            .padding(.horizontal)
        }
        .navigationTitle("Favorites")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("Favorites")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color("AccentPink"))
            }
        }
        .background(Color.black)
    }
}

#Preview {
    NavigationStack {
        FavoritesView()
    }
    .environmentObject(AppState())
}
