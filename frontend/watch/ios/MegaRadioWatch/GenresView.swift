// GenresView.swift
// Genres list view for Apple Watch

import SwiftUI

struct GenresView: View {
    let genres = [
        ("Pop", "music.note"),
        ("Rock", "guitars"),
        ("Jazz", "pianokeys"),
        ("Klasik", "music.quarternote.3"),
        ("Haber", "newspaper"),
        ("Spor", "sportscourt")
    ]
    
    var body: some View {
        NavigationStack {
            List(genres, id: \.0) { genre in
                HStack {
                    Image(systemName: genre.1)
                        .foregroundColor(.pink)
                        .frame(width: 24)
                    
                    Text(genre.0)
                        .font(.system(size: 14))
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .foregroundColor(.gray)
                        .font(.system(size: 10))
                }
            }
            .navigationTitle("Türler")
        }
    }
}

#Preview {
    GenresView()
}
