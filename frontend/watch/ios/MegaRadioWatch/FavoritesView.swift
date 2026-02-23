// FavoritesView.swift
// Favorites list view for Apple Watch

import SwiftUI

struct FavoritesView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 8) {
                    if appState.favorites.isEmpty {
                        emptyState
                    } else {
                        ForEach(appState.favorites) { station in
                            NavigationLink(destination: NowPlayingView(station: station)) {
                                StationRowButton(title: station.name)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                .padding(.horizontal, 8)
            }
            .navigationTitle("Favoriler")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.black)
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "heart.slash")
                .font(.system(size: 28))
                .foregroundColor(.gray)
            
            Text("Henuz favori yok")
                .font(.system(size: 13))
                .foregroundColor(.gray)
        }
        .padding(.top, 30)
    }
}

#Preview {
    FavoritesView()
        .environmentObject(AppState())
}
