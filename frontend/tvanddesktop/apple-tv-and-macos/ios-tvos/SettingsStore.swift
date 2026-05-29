// SettingsStore.swift — Persists the user's Settings choices.
//
// Mirrors the state the web `Settings.tsx` keeps across
// LocalizationContext / SleepTimerContext / AccessibilityContext +
// localStorage("playAtStart" / "preferredKeyboard"). Kept intentionally
// light: it stores the selections so the UI reflects them 1:1 with the web.

import Foundation
import Combine

@MainActor
final class SettingsStore: ObservableObject {
    static let shared = SettingsStore()

    @Published var language: String { didSet { d.set(language, forKey: "megaradio.tv.language") } }
    @Published var keyboardId: String { didSet { d.set(keyboardId, forKey: "preferredKeyboard") } }
    @Published var playAtStart: String { didSet { d.set(playAtStart, forKey: "playAtStart") } }
    @Published var sleepTimerMinutes: Int? { didSet { d.set(sleepTimerMinutes ?? -1, forKey: "megaradio.tv.sleep") } }
    @Published var highContrast: Bool { didSet { d.set(highContrast, forKey: "megaradio.tv.highContrast") } }
    @Published var largeText: Bool { didSet { d.set(largeText, forKey: "megaradio.tv.largeText") } }

    private let d = UserDefaults.standard

    private init() {
        language = d.string(forKey: "megaradio.tv.language") ?? "en"
        keyboardId = d.string(forKey: "preferredKeyboard") ?? "en"
        playAtStart = d.string(forKey: "playAtStart") ?? "none"
        let s = d.object(forKey: "megaradio.tv.sleep") as? Int
        sleepTimerMinutes = (s == nil || s == -1) ? nil : s
        highContrast = d.bool(forKey: "megaradio.tv.highContrast")
        largeText = d.bool(forKey: "megaradio.tv.largeText")
    }
}
