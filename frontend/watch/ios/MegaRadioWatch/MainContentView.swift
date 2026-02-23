// MainContentView.swift
// Main navigation view for MegaRadio Watch App

import SwiftUI

struct MainContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        TabView {
            // Now Playing Tab
            NowPlayingView()
                .tabItem {
                    Label("Caliyor", systemImage: "play.circle.fill")
                }
            
            // Favorites Tab
            FavoritesView()
                .tabItem {
                    Label("Favoriler", systemImage: "heart.fill")
                }
            
            // Genres Tab
            GenresView()
                .tabItem {
                    Label("Turler", systemImage: "music.note.list")
                }
            
            // Countries Tab
            CountryView()
                .tabItem {
                    Label("Ulkeler", systemImage: "globe")
                }
        }
    }
}

#Preview {
    MainContentView()
        .environmentObject(AppState())
}
