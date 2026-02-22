// MainContentView.swift
// Main navigation view for MegaRadio Watch App

import SwiftUI

struct MainContentView: View {
    @StateObject private var connectivityService = WatchConnectivityService()
    
    var body: some View {
        TabView {
            // Now Playing Tab
            NowPlayingView()
                .tabItem {
                    Label("Çalıyor", systemImage: "play.circle.fill")
                }
            
            // Favorites Tab
            FavoritesView()
                .tabItem {
                    Label("Favoriler", systemImage: "heart.fill")
                }
            
            // Genres Tab
            GenresView()
                .tabItem {
                    Label("Türler", systemImage: "music.note.list")
                }
            
            // Countries Tab
            CountryView()
                .tabItem {
                    Label("Ülkeler", systemImage: "globe")
                }
        }
        .environmentObject(connectivityService)
    }
}

#Preview {
    MainContentView()
}
