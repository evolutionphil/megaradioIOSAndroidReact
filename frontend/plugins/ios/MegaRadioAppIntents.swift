// MegaRadio App Shortcuts (iOS 16+) — zero-setup Siri support
// "Hey Siri, play last station in MegaRadio" / "Hey Siri, MegaRadio'da son istasyonu çal"
// The intent foregrounds the app and dispatches megaradio://?playLast=1 through
// the standard Linking pipeline, handled by QuickActionsHandler in JS.

import AppIntents
import UIKit

@available(iOS 16.0, *)
struct PlayLastStationIntent: AppIntent {
  static var title: LocalizedStringResource = "Play Last Station"
  static var description = IntentDescription("Plays the last played radio station")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    if let url = URL(string: "megaradio://?playLast=1") {
      await UIApplication.shared.open(url)
    }
    return .result()
  }
}

@available(iOS 16.0, *)
struct MegaRadioAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: PlayLastStationIntent(),
      phrases: [
        "Play last station in \(.applicationName)",
        "Play the last station in \(.applicationName)",
        "Resume radio in \(.applicationName)",
        "\(.applicationName)'da son istasyonu çal",
        "\(.applicationName) son istasyonu çal",
        "\(.applicationName)'da radyoyu aç"
      ],
      shortTitle: "Play Last Station",
      systemImageName: "play.circle"
    )
  }
}
