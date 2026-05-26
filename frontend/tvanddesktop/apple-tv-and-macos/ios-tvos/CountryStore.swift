// CountryStore.swift — User-selected country for filtering stations.
//
// Mirrors `web-preview/src/contexts/CountryContext.tsx`.

import Foundation
import Combine

@MainActor
final class CountryStore: ObservableObject {
    static let shared = CountryStore()

    @Published var selectedCountryCode: String = "GLOBAL"
    @Published var selectedCountryName: String = "Global"
    @Published var selectedCountryFlag: String = "🌐"

    private let key = "megaradio.tv.country"

    private init() {
        if let raw = UserDefaults.standard.dictionary(forKey: key),
           let code = raw["code"] as? String,
           let name = raw["name"] as? String {
            self.selectedCountryCode = code
            self.selectedCountryName = name
            self.selectedCountryFlag = (raw["flag"] as? String) ?? "🌐"
        }
    }

    func set(code: String, name: String, flag: String) {
        selectedCountryCode = code
        selectedCountryName = name
        selectedCountryFlag = flag
        UserDefaults.standard.set([
            "code": code, "name": name, "flag": flag
        ], forKey: key)
    }
}
