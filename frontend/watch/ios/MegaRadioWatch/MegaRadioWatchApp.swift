// MegaRadioWatchApp.swift
// Main entry point for MegaRadio Watch App

import SwiftUI

@main
struct MegaRadioWatchApp: App {
    // Initialize watch session manager
    @StateObject private var sessionManager = WatchSessionManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(sessionManager)
                .onAppear {
                    // Request initial data when app launches
                    sessionManager.requestFavorites()
                    sessionManager.requestNowPlaying()
                    sessionManager.requestGenres()
                }
        }
    }
}
