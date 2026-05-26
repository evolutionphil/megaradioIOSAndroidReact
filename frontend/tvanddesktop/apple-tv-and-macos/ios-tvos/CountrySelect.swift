// CountrySelect.swift — Port of `web-preview/src/pages/CountrySelectPage.tsx`
// and `components/CountrySelector.tsx`. Lets the user pick the active country
// used to filter Discover / Genres results.

import SwiftUI

struct CountrySelectPage: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var country: CountryStore

    @State private var query: String = ""

    /// Hard-coded short list — the full version reads from the backend.
    /// This subset matches the most-streamed countries in the web preview's
    /// `lib/countries.ts`. ISO-3166-1 alpha-2 codes.
    private let countries: [(code: String, name: String, flag: String)] = [
        ("GLOBAL", "Global", "🌐"),
        ("US",     "United States", "🇺🇸"),
        ("GB",     "United Kingdom", "🇬🇧"),
        ("DE",     "Germany", "🇩🇪"),
        ("FR",     "France", "🇫🇷"),
        ("IT",     "Italy", "🇮🇹"),
        ("ES",     "Spain", "🇪🇸"),
        ("NL",     "Netherlands", "🇳🇱"),
        ("TR",     "Türkiye", "🇹🇷"),
        ("BR",     "Brazil", "🇧🇷"),
        ("MX",     "Mexico", "🇲🇽"),
        ("AR",     "Argentina", "🇦🇷"),
        ("JP",     "Japan", "🇯🇵"),
        ("KR",     "South Korea", "🇰🇷"),
        ("IN",     "India", "🇮🇳"),
        ("AU",     "Australia", "🇦🇺"),
        ("CA",     "Canada", "🇨🇦"),
        ("CN",     "China", "🇨🇳"),
        ("RU",     "Russia", "🇷🇺"),
        ("ZA",     "South Africa", "🇿🇦"),
    ]

    private var filtered: [(code: String, name: String, flag: String)] {
        guard !query.isEmpty else { return countries }
        return countries.filter { $0.name.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        Stage1920x1080 {
            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            AppSidebar(active: .countrySelect)

            VStack(alignment: .leading, spacing: 30) {
                Text("Choose a country")
                    .font(.ubuntu(56, .bold))
                    .foregroundColor(.white)

                // Search input.
                HStack(spacing: 14) {
                    BrandImage(name: "search-icon").frame(width: 28, height: 28)
                    TextField("Search countries", text: $query)
                        .textFieldStyle(.plain)
                        .font(.ubuntu(26))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 24).padding(.vertical, 14)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.10)))
                .frame(width: 900)

                ScrollView(.vertical, showsIndicators: false) {
                    LazyVGrid(
                        columns: Array(repeating: GridItem(.fixed(330), spacing: 24), count: 5),
                        spacing: 24
                    ) {
                        ForEach(filtered, id: \.code) { c in
                            CountryTile(
                                code: c.code, name: c.name, flag: c.flag,
                                isSelected: c.code == country.selectedCountryCode
                            ) {
                                country.set(code: c.code, name: c.name, flag: c.flag)
                                router.back()
                            }
                        }
                    }
                    .padding(.bottom, 100)
                }
            }
            .frame(width: 1700, height: 910, alignment: .topLeading)
            .offset(x: 192, y: 170)
        }
    }
}

private struct CountryTile: View {
    let code: String
    let name: String
    let flag: String
    let isSelected: Bool
    let onTap: () -> Void
    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 18) {
                Text(flag).font(.system(size: 44))
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).font(.ubuntu(22, .bold)).foregroundColor(.white)
                    Text(code).font(.ubuntu(16)).foregroundColor(Theme.textSecondary)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Theme.accent)
                }
            }
            .padding(.horizontal, 22).padding(.vertical, 18)
            .frame(width: 330, height: 90)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isFocused ? Theme.accentFocusBg : Color.white.opacity(0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isFocused ? Theme.accent : .clear, lineWidth: 3)
            )
            .scaleEffect(isFocused ? 1.04 : 1)
        }
        .buttonStyle(.tvTransparent)
        .focused($isFocused)
    }
}
