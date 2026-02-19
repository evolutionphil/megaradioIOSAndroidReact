// CountryView.swift
// Country list and country stations views

import SwiftUI

// MARK: - Country List View
struct CountryListView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                ForEach(appState.countries) { country in
                    NavigationLink(destination: CountryStationsView(country: country)) {
                        ListRowButton(title: country.name)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.horizontal)
        }
        .navigationTitle("Country")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("Country")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color("AccentPink"))
            }
        }
        .background(Color.black)
    }
}

// MARK: - Country Stations View
struct CountryStationsView: View {
    @EnvironmentObject var appState: AppState
    let country: Country
    
    // Mock stations for the country
    var stations: [Station] {
        switch country.code {
        case "TR":
            return [
                Station(id: "1", name: "Metro FM", country: "Turkey", city: "Istanbul", logoUrl: nil),
                Station(id: "2", name: "Power Türk", country: "Turkey", city: "Istanbul", logoUrl: nil),
                Station(id: "3", name: "CNN Türk", country: "Turkey", city: "Ankara", logoUrl: nil),
                Station(id: "4", name: "Kral FM", country: "Turkey", city: "Istanbul", logoUrl: nil),
                Station(id: "5", name: "Virgin Radio", country: "Turkey", city: "Istanbul", logoUrl: nil),
            ]
        case "DE":
            return [
                Station(id: "de1", name: "Radio Energy", country: "Germany", city: "Berlin", logoUrl: nil),
                Station(id: "de2", name: "Bayern 3", country: "Germany", city: "Munich", logoUrl: nil),
                Station(id: "de3", name: "WDR 2", country: "Germany", city: "Cologne", logoUrl: nil),
            ]
        case "FR":
            return [
                Station(id: "fr1", name: "NRJ", country: "France", city: "Paris", logoUrl: nil),
                Station(id: "fr2", name: "RTL", country: "France", city: "Paris", logoUrl: nil),
                Station(id: "fr3", name: "Fun Radio", country: "France", city: "Paris", logoUrl: nil),
            ]
        default:
            return [
                Station(id: "def1", name: "Radio 1", country: country.name, city: nil, logoUrl: nil),
                Station(id: "def2", name: "Radio 2", country: country.name, city: nil, logoUrl: nil),
            ]
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                ForEach(stations) { station in
                    NavigationLink(destination: NowPlayingView(station: station)) {
                        StationRowButton(title: station.name)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .simultaneousGesture(TapGesture().onEnded {
                        appState.playStation(station)
                    })
                }
            }
            .padding(.horizontal)
        }
        .navigationTitle(country.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text(country.name)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color("AccentPink"))
            }
        }
        .background(Color.black)
    }
}

#Preview {
    NavigationStack {
        CountryListView()
    }
    .environmentObject(AppState())
}
