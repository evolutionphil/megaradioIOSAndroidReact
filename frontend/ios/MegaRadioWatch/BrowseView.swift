// BrowseView.swift
// Browse tab - Genres and Countries selection for Apple Watch

import SwiftUI

struct BrowseView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    var body: some View {
        NavigationStack {
            List {
                // Genres Section
                NavigationLink(destination: GenresView()
                    .environmentObject(sessionManager)) {
                    HStack(spacing: 12) {
                        Image(systemName: "music.note.list")
                            .foregroundColor(.pink)
                            .font(.system(size: 16))
                            .frame(width: 24)
                        
                        Text("Turler")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                        
                        Spacer()
                    }
                }
                .listRowBackground(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.2))
                )
                
                // Countries Section
                NavigationLink(destination: CountriesView()
                    .environmentObject(sessionManager)) {
                    HStack(spacing: 12) {
                        Image(systemName: "globe")
                            .foregroundColor(.pink)
                            .font(.system(size: 16))
                            .frame(width: 24)
                        
                        Text("Ulkeler")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.white)
                        
                        Spacer()
                    }
                }
                .listRowBackground(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.2))
                )
            }
            .listStyle(.plain)
            .navigationTitle("Kesfet")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    BrowseView()
        .environmentObject(WatchSessionManager.shared)
}
