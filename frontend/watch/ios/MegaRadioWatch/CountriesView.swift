// CountriesView.swift
// Country list view for Apple Watch

import SwiftUI

struct CountriesView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    
    var body: some View {
        Group {
            if sessionManager.countries.isEmpty {
                // Empty/Loading state
                VStack(spacing: 8) {
                    if !sessionManager.isReachable {
                        Image(systemName: "iphone.slash")
                            .font(.system(size: 28))
                            .foregroundColor(.orange)
                        
                        Text("iPhone'a baglan")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                    } else {
                        ProgressView()
                            .tint(.pink)
                        
                        Text("Ulkeler yukleniyor...")
                            .font(.system(size: 12))
                            .foregroundColor(.gray)
                    }
                    
                    Button(action: {
                        sessionManager.requestCountries()
                    }) {
                        Text("Yenile")
                            .font(.system(size: 11))
                    }
                    .padding(.top, 8)
                }
                .padding()
            } else {
                // Countries list
                List(sessionManager.countries) { country in
                    NavigationLink(destination: CountryStationsView(country: country)
                        .environmentObject(sessionManager)) {
                        HStack(spacing: 10) {
                            // Country flag emoji
                            Text(country.flag)
                                .font(.system(size: 16))
                                .frame(width: 24)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text(country.name)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                
                                if country.stationCount > 0 {
                                    Text("\(country.stationCount) istasyon")
                                        .font(.system(size: 9))
                                        .foregroundColor(.gray)
                                }
                            }
                            
                            Spacer()
                        }
                    }
                    .listRowBackground(Color.clear)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Ulkeler")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            sessionManager.requestCountries()
        }
    }
}

#Preview {
    CountriesView()
        .environmentObject(WatchSessionManager.shared)
}
