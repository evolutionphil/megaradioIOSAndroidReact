// ContentView.swift
// Main content view for MegaRadio Watch App

import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            NowPlayingView()
                .tag(0)
            
            FavoritesView()
                .tag(1)
            
            GenresView()
                .tag(2)
        }
        .tabViewStyle(.page)
    }
}

#Preview {
    ContentView()
}
