// MegaRadioWatchApp.swift
// Main entry point for MegaRadio Watch App

import SwiftUI

@main
struct MegaRadioWatchApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            MainContentView()
                .environmentObject(appState)
        }
    }
}
