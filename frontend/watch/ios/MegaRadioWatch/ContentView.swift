// ContentView.swift
// Main navigation and splash screen

import SwiftUI

struct ContentView: View {
    @State private var showSplash = true
    
    var body: some View {
        ZStack {
            if showSplash {
                SplashView()
                    .transition(.opacity)
            } else {
                HomeView()
                    .transition(.opacity)
            }
        }
        .onAppear {
            // Show splash for 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                withAnimation(.easeInOut(duration: 0.5)) {
                    showSplash = false
                }
            }
        }
    }
}

// MARK: - Splash View
struct SplashView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 8) {
                // Logo
                Image(systemName: "music.note")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(Color("AccentPink"))
                
                Text("mega")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                + Text("radio")
                    .font(.system(size: 24, weight: .regular))
                    .foregroundColor(.white)
            }
        }
    }
}

// MARK: - Home View
struct HomeView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    // Genres Button
                    NavigationLink(destination: GenresListView()) {
                        MenuButton(title: "Genres")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Country Button
                    NavigationLink(destination: CountryListView()) {
                        MenuButton(title: "Country")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Favorites Button
                    NavigationLink(destination: FavoritesView()) {
                        MenuButton(title: "Favorites")
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.horizontal)
            }
            .navigationTitle("MegaRadio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("MegaRadio")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Color("AccentPink"))
                }
            }
            .background(Color.black)
        }
    }
}

// MARK: - Menu Button Component
struct MenuButton: View {
    let title: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.gray)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color(white: 0.15))
        .cornerRadius(12)
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
