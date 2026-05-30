// CountryCatalog.swift — Country list + ISO mapping + flag URLs.
//
// Mirrors `web-preview/src/services/megaRadioApi.ts`:
//   • GET /countries returns an array of country NAME strings.
//   • Each name maps to an ISO-3166-1 alpha-2 code (COUNTRY_NAME_TO_CODE).
//   • Flags are rendered from `https://flagcdn.com/w80/<iso>.png`.
//
// Used by `CountrySelect.swift` (the on-TV country picker) and the Discover
// header pill so flags render identically to the web/Tizen build.

import Foundation
import Combine

struct CountryItem: Identifiable, Hashable {
    let name: String   // full API name, e.g. "The United States Of America"
    let code: String   // ISO alpha-2, e.g. "US", or "GLOBAL" / "XX"
    var id: String { code + name }

    /// flagcdn URL (nil for unknown — caller renders a neutral placeholder).
    var flagURL: URL? {
        guard code != "GLOBAL", code != "XX", code.count == 2 else { return nil }
        return URL(string: "https://flagcdn.com/w80/\(code.lowercased()).png")
    }
}

@MainActor
final class CountryCatalog: ObservableObject {
    static let shared = CountryCatalog()

    @Published private(set) var countries: [CountryItem] = []
    @Published private(set) var isLoading = false

    private init() {}

    /// ISO code for a full country name (returns "XX" when unmapped).
    static func code(for name: String) -> String { nameToCode[name] ?? "XX" }

    /// Reverse map: ISO code → first matching full country name.
    static let codeToName: [String: String] = {
        var m: [String: String] = [:]
        for (name, code) in nameToCode where m[code] == nil { m[code] = name }
        return m
    }()

    /// Full catalog name for an ISO code (nil when unmapped).
    static func name(for code: String) -> String? { codeToName[code.uppercased()] }

    func loadIfNeeded() {
        guard countries.isEmpty, !isLoading else { return }
        isLoading = true
        Task {
            do {
                let names: [String] = try await APIClient.shared.get("/api/countries")
                let mapped = names
                    .map { CountryItem(name: $0, code: Self.code(for: $0)) }
                    .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
                self.countries = mapped
            } catch {
                NSLog("[CountryCatalog] load failed: \(error)")
            }
            self.isLoading = false
        }
    }

    // Generated from web-preview COUNTRY_NAME_TO_CODE (228 entries).
    static let nameToCode: [String: String] = [
        "Afghanistan": "AF",
        "Aland Islands": "AX",
        "Albania": "AL",
        "Algeria": "DZ",
        "American Samoa": "AS",
        "Andorra": "AD",
        "Angola": "AO",
        "Anguilla": "AI",
        "Antarctica": "AQ",
        "Antigua And Barbuda": "AG",
        "Argentina": "AR",
        "Armenia": "AM",
        "Aruba": "AW",
        "Ascension And Tristan Da Cunha Saint Helena": "SH",
        "Australia": "AU",
        "Austria": "AT",
        "Azerbaijan": "AZ",
        "Bahrain": "BH",
        "Bangladesh": "BD",
        "Barbados": "BB",
        "Belarus": "BY",
        "Belgium": "BE",
        "Belize": "BZ",
        "Benin": "BJ",
        "Bermuda": "BM",
        "Bhutan": "BT",
        "Bolivarian Republic Of Venezuela": "VE",
        "Bolivia": "BO",
        "Bonaire": "BQ",
        "Bosnia And Herzegovina": "BA",
        "Botswana": "BW",
        "Brazil": "BR",
        "British Indian Ocean Territory": "IO",
        "British Virgin Islands": "VG",
        "Brunei Darussalam": "BN",
        "Bulgaria": "BG",
        "Burkina Faso": "BF",
        "Burundi": "BI",
        "Cabo Verde": "CV",
        "Cambodia": "KH",
        "Cameroon": "CM",
        "Canada": "CA",
        "Chad": "TD",
        "Chile": "CL",
        "China": "CN",
        "Colombia": "CO",
        "Costa Rica": "CR",
        "Coted Ivoire": "CI",
        "Croatia": "HR",
        "Cuba": "CU",
        "Curacao": "CW",
        "Cyprus": "CY",
        "Czechia": "CZ",
        "Denmark": "DK",
        "Djibouti": "DJ",
        "Dominica": "DM",
        "Ecuador": "EC",
        "Egypt": "EG",
        "El Salvador": "SV",
        "Eritrea": "ER",
        "Estonia": "EE",
        "Ethiopia": "ET",
        "Fiji": "FJ",
        "Finland": "FI",
        "France": "FR",
        "French Guiana": "GF",
        "French Polynesia": "PF",
        "Gabon": "GA",
        "Georgia": "GE",
        "Germany": "DE",
        "Ghana": "GH",
        "Gibraltar": "GI",
        "Greece": "GR",
        "Greenland": "GL",
        "Grenada": "GD",
        "Guadeloupe": "GP",
        "Guam": "GU",
        "Guatemala": "GT",
        "Guernsey": "GG",
        "Guinea": "GN",
        "Guinea Bissau": "GW",
        "Guyana": "GY",
        "Haiti": "HT",
        "Honduras": "HN",
        "Hong Kong": "HK",
        "Hungary": "HU",
        "Iceland": "IS",
        "India": "IN",
        "Indonesia": "ID",
        "Iran": "IR",
        "Iraq": "IQ",
        "Ireland": "IE",
        "Islamic Republic Of Iran": "IR",
        "Isle Of Man": "IM",
        "Israel": "IL",
        "Italy": "IT",
        "Jamaica": "JM",
        "Japan": "JP",
        "Jordan": "JO",
        "Kazakhstan": "KZ",
        "Kenya": "KE",
        "Kosovo": "XK",
        "Kuwait": "KW",
        "Kyrgyzstan": "KG",
        "Latvia": "LV",
        "Lebanon": "LB",
        "Lesotho": "LS",
        "Liberia": "LR",
        "Libya": "LY",
        "Liechtenstein": "LI",
        "Lithuania": "LT",
        "Luxembourg": "LU",
        "Macao": "MO",
        "Madagascar": "MG",
        "Malawi": "MW",
        "Malaysia": "MY",
        "Maldives": "MV",
        "Mali": "ML",
        "Malta": "MT",
        "Martinique": "MQ",
        "Mauritania": "MR",
        "Mauritius": "MU",
        "Mayotte": "YT",
        "Mexico": "MX",
        "Monaco": "MC",
        "Mongolia": "MN",
        "Montenegro": "ME",
        "Montserrat": "MS",
        "Morocco": "MA",
        "Mozambique": "MZ",
        "Myanmar": "MM",
        "Namibia": "NA",
        "Nepal": "NP",
        "New Caledonia": "NC",
        "New Zealand": "NZ",
        "Nicaragua": "NI",
        "Nigeria": "NG",
        "Niue": "NU",
        "Norway": "NO",
        "Oman": "OM",
        "Pakistan": "PK",
        "Palau": "PW",
        "Panama": "PA",
        "Papua New Guinea": "PG",
        "Paraguay": "PY",
        "Peru": "PE",
        "Poland": "PL",
        "Portugal": "PT",
        "Puerto Rico": "PR",
        "Qatar": "QA",
        "Republic Of North Macedonia": "MK",
        "Reunion": "RE",
        "Romania": "RO",
        "Rwanda": "RW",
        "Saint Kitts And Nevis": "KN",
        "Saint Lucia": "LC",
        "Saint Pierre And Miquelon": "PM",
        "Saint Vincent And The Grenadines": "VC",
        "San Marino": "SM",
        "Sao Tome And Principe": "ST",
        "Saudi Arabia": "SA",
        "Senegal": "SN",
        "Serbia": "RS",
        "Seychelles": "SC",
        "Sierra Leone": "SL",
        "Singapore": "SG",
        "Slovakia": "SK",
        "Slovenia": "SI",
        "Solomon Islands": "SB",
        "Somalia": "SO",
        "South Africa": "ZA",
        "South Sudan": "SS",
        "Spain": "ES",
        "Sri Lanka": "LK",
        "State Of Palestine": "PS",
        "Suriname": "SR",
        "Sweden": "SE",
        "Switzerland": "CH",
        "Syrian Arab Republic": "SY",
        "Taiwan, Republic Of China": "TW",
        "Tajikistan": "TJ",
        "Thailand": "TH",
        "The Bahamas": "BS",
        "The Cayman Islands": "KY",
        "The Central African Republic": "CF",
        "The Cocos Keeling Islands": "CC",
        "The Comoros": "KM",
        "The Congo": "CG",
        "The Cook Islands": "CK",
        "The Democratic Peoples Republic Of Korea": "KP",
        "The Democratic Republic Of The Congo": "CD",
        "The Dominican Republic": "DO",
        "The Falkland Islands Malvinas": "FK",
        "The Faroe Islands": "FO",
        "The French Southern Territories": "TF",
        "The Gambia": "GM",
        "The Holy See": "VA",
        "The Lao Peoples Democratic Republic": "LA",
        "The Netherlands": "NL",
        "The Niger": "NE",
        "The Philippines": "PH",
        "The Republic Of Korea": "KR",
        "The Republic Of Moldova": "MD",
        "The Russian Federation": "RU",
        "The Sudan": "SD",
        "The United Arab Emirates": "AE",
        "The United Kingdom Of Great Britain And Northern Ireland": "GB",
        "The United States Minor Outlying Islands": "UM",
        "The United States Of America": "US",
        "Timor Leste": "TL",
        "Togo": "TG",
        "Tonga": "TO",
        "Trinidad And Tobago": "TT",
        "Tunisia": "TN",
        "Türkiye": "TR",
        "Turkmenistan": "TM",
        "Uganda": "UG",
        "Ukraine": "UA",
        "United Republic Of Tanzania": "TZ",
        "Uruguay": "UY",
        "US Virgin Islands": "VI",
        "Uzbekistan": "UZ",
        "Vanuatu": "VU",
        "Vietnam": "VN",
        "Wallis And Futuna": "WF",
        "Yemen": "YE",
        "Zambia": "ZM",
        "Zimbabwe": "ZW",
    ]
}
