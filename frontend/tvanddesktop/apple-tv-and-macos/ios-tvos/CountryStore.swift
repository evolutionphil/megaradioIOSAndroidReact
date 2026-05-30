// CountryStore.swift — User-selected country for filtering stations.
//
// Mirrors `web-preview/src/contexts/CountryContext.tsx` + the language→country
// auto-detection in `LocalizationContext.tsx`.
//
// RULES (per product requirement):
//   • There is NO "Global" option anywhere. A concrete country is ALWAYS active.
//   • On first launch (nothing saved) we auto-detect the country from the
//     device language/region.
//   • If detection fails, we fall back to the United Kingdom (GB).

import Foundation
import Combine

@MainActor
final class CountryStore: ObservableObject {
    static let shared = CountryStore()

    @Published var selectedCountryCode: String
    @Published var selectedCountryName: String
    @Published var selectedCountryFlag: String   // stores the ISO code; flag URL derived from it

    private let key = "megaradio.tv.country"

    // Language code → (display name, ISO code). Mirrors LANGUAGE_TO_COUNTRY in
    // the web LocalizationContext so auto-detection matches the Tizen build.
    private static let languageToCountry: [String: (String, String)] = [
        "en": ("United Kingdom", "GB"), "de": ("Germany", "DE"), "fr": ("France", "FR"),
        "es": ("Spain", "ES"), "it": ("Italy", "IT"), "pt": ("Portugal", "PT"),
        "ru": ("Russia", "RU"), "ja": ("Japan", "JP"), "zh": ("China", "CN"),
        "ar": ("Saudi Arabia", "SA"), "tr": ("Türkiye", "TR"), "pl": ("Poland", "PL"),
        "nl": ("Netherlands", "NL"), "sv": ("Sweden", "SE"), "no": ("Norway", "NO"),
        "da": ("Denmark", "DK"), "fi": ("Finland", "FI"), "cs": ("Czechia", "CZ"),
        "hu": ("Hungary", "HU"), "ro": ("Romania", "RO"), "el": ("Greece", "GR"),
        "th": ("Thailand", "TH"), "ko": ("South Korea", "KR"), "vi": ("Vietnam", "VN"),
        "id": ("Indonesia", "ID"), "ms": ("Malaysia", "MY"), "hi": ("India", "IN"),
        "uk": ("Ukraine", "UA"), "bg": ("Bulgaria", "BG"), "sr": ("Serbia", "RS"),
        "hr": ("Croatia", "HR"), "sk": ("Slovakia", "SK"), "sl": ("Slovenia", "SI"),
    ]

    private static let fallback: (name: String, code: String) = ("United Kingdom", "GB")

    private init() {
        if let raw = UserDefaults.standard.dictionary(forKey: key),
           let code = raw["code"] as? String,
           let name = raw["name"] as? String,
           code != "GLOBAL" {
            self.selectedCountryCode = code
            self.selectedCountryName = name
            self.selectedCountryFlag = (raw["flag"] as? String) ?? code
        } else {
            // Auto-detect from the device. Prefer the explicit region; fall back
            // to the language→country map; finally to the UK.
            let detected = Self.detect()
            self.selectedCountryCode = detected.code
            self.selectedCountryName = detected.name
            self.selectedCountryFlag = detected.code
        }
    }

    /// Detect the user's country from the device locale.
    private static func detect() -> (name: String, code: String) {
        // 1. Region from the device locale (e.g. "US", "TR").
        if let region = Locale.current.region?.identifier.uppercased(),
           region.count == 2,
           let name = CountryCatalog.name(for: region) {
            return (name, region)
        }
        // 2. Language → country mapping (matches the web build).
        let lang = (Locale.current.language.languageCode?.identifier ?? "en").lowercased()
        if let mapped = languageToCountry[lang] {
            return (mapped.0, mapped.1)
        }
        // 3. UK fallback.
        return fallback
    }

    func set(code: String, name: String, flag: String) {
        // Defend against any stray "Global" selection sneaking in.
        guard code != "GLOBAL" else { return }
        selectedCountryCode = code
        selectedCountryName = name
        selectedCountryFlag = flag
        UserDefaults.standard.set([
            "code": code, "name": name, "flag": flag
        ], forKey: key)
    }
}
