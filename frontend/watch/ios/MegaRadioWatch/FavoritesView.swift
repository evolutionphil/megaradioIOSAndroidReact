// FavoritesView.swift
// Favorites list view for Apple Watch

import SwiftUI

struct FavoritesView: View {
    let favorites = [
        "Metro FM",
        "Power Türk",
        "Kral FM",
        "Virgin Radio TR",
        "NRJ Türkiye"
    ]
    
    var body: some View {
        NavigationStack {
            List(favorites, id: \.self) { station in
                HStack {
                    Image(systemName: "radio")
                        .foregroundColor(.pink)
                    
                    Text(station)
                        .font(.system(size: 14))
                    
                    Spacer()
                    
                    Image(systemName: "play.circle")
                        .foregroundColor(.gray)
                }
            }
            .navigationTitle("Favoriler")
        }
    }
}

#Preview {
    FavoritesView()
}
