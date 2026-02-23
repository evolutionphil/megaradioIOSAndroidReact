// CountryView.swift
// Country list and country stations views for Apple Watch

import SwiftUI

// MARK: - Main Country View (Entry Point)
struct CountryView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 8) {
                    ForEach(appState.countries) { country in
                        NavigationLink(destination: CountryStationsView(country: country)) {
                            CountryRowButton(
                                title: country.name,
                                flag: country.flagEmoji
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal, 8)
            }
            .navigationTitle("Ulkeler")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.black)
        }
    }
}

// MARK: - Country Stations View
struct CountryStationsView: View {
    @EnvironmentObject var appState: AppState
    let country: Country
    
    // Sample stations for the country
    var stations: [Station] {
        switch country.code {
        case "TR":
            return [
                Station(id: "tr1", name: "Metro FM", country: "Turkiye", city: "Istanbul"),
                Station(id: "tr2", name: "Power Turk", country: "Turkiye", city: "Istanbul"),
                Station(id: "tr3", name: "CNN Turk Radyo", country: "Turkiye", city: "Ankara"),
                Station(id: "tr4", name: "Kral FM", country: "Turkiye", city: "Istanbul"),
                Station(id: "tr5", name: "Virgin Radio TR", country: "Turkiye", city: "Istanbul"),
            ]
        case "DE":
            return [
                Station(id: "de1", name: "Radio Energy", country: "Almanya", city: "Berlin"),
                Station(id: "de2", name: "Bayern 3", country: "Almanya", city: "Munich"),
                Station(id: "de3", name: "WDR 2", country: "Almanya", city: "Cologne"),
            ]
        case "FR":
            return [
                Station(id: "fr1", name: "NRJ", country: "Fransa", city: "Paris"),
                Station(id: "fr2", name: "RTL", country: "Fransa", city: "Paris"),
                Station(id: "fr3", name: "Fun Radio", country: "Fransa", city: "Paris"),
            ]
        case "US":
            return [
                Station(id: "us1", name: "iHeartRadio", country: "Amerika", city: "New York"),
                Station(id: "us2", name: "KEXP", country: "Amerika", city: "Seattle"),
                Station(id: "us3", name: "NPR", country: "Amerika", city: "Washington"),
            ]
        default:
            return [
                Station(id: "\(country.code)_1", name: "\(country.name) Radio 1", country: country.name),
                Station(id: "\(country.code)_2", name: "\(country.name) Radio 2", country: country.name),
            ]
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                ForEach(stations) { station in
                    NavigationLink(destination: NowPlayingView(station: station)) {
                        StationRowButton(title: station.name)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.horizontal, 8)
        }
        .navigationTitle(country.name)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color.black)
    }
}

// MARK: - Country Row Button Component
struct CountryRowButton: View {
    let title: String
    var flag: String?
    
    var body: some View {
        HStack {
            if let flag = flag {
                Text(flag)
                    .font(.system(size: 16))
            }
            
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.white)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.gray)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(white: 0.15))
        .cornerRadius(8)
    }
}

#Preview {
    CountryView()
        .environmentObject(AppState())
}
