// ContentView.swift
// Main content view for MegaRadio Watch App

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            NowPlayingView()
                .environmentObject(sessionManager)
                .tag(0)
            
            FavoritesView()
                .environmentObject(sessionManager)
                .tag(1)
            
            GenresView()
                .environmentObject(sessionManager)
                .tag(2)
        }
        .tabViewStyle(.page)
        .onAppear {
            // Refresh data when view appears
            sessionManager.requestNowPlaying()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WatchSessionManager.shared)
}
