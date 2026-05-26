// Search.swift — Port of `web-preview/src/pages/Search.tsx`.

import SwiftUI

struct SearchPage: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var player: AudioPlayer
    @State private var query: String = ""
    @State private var results: [Station] = []
    @State private var searching = false
    @State private var debounceTask: Task<Void, Never>?

    var body: some View {
        Stage1920x1080 {
            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            CountryTriggerHeader().offset(x: 1453, y: 67)
            LoginHeaderButton().offset(x: 1694, y: 67)
            AppSidebar(active: .search)

            VStack(alignment: .leading, spacing: 30) {
                Text("Search").font(.ubuntu(56, .bold)).foregroundColor(.white)

                HStack(spacing: 18) {
                    BrandImage(name: "search-icon").frame(width: 32, height: 32)
                    TextField("Type a station, artist, or city", text: $query)
                        .textFieldStyle(.plain)
                        .font(.ubuntu(28))
                        .foregroundColor(.white)
                        .onChange(of: query) { _, v in scheduleSearch(v) }
                }
                .padding(.horizontal, 28)
                .padding(.vertical, 18)
                .background(
                    RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.10))
                )
                .frame(width: 1200)

                if searching {
                    HStack { Spacer(); ProgressView().scaleEffect(2); Spacer() }
                        .frame(height: 500)
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.fixed(200), spacing: 24), count: 7),
                            spacing: 30
                        ) {
                            ForEach(results) { s in
                                StationCardLarge(station: s) {
                                    player.play(s)
                                    router.go(.radioPlaying)
                                }
                            }
                        }
                        .padding(.bottom, 100)
                    }
                }
            }
            .frame(width: 1700, height: 910, alignment: .topLeading)
            .offset(x: 192, y: 170)
        }
    }

    private func scheduleSearch(_ q: String) {
        debounceTask?.cancel()
        debounceTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            guard !Task.isCancelled else { return }
            await runSearch(q)
        }
    }
    private func runSearch(_ q: String) async {
        let trimmed = q.trimmingCharacters(in: .whitespaces)
        if trimmed.count < 2 { results = []; return }
        searching = true
        do { results = try await APIClient.shared.searchStations(trimmed, limit: 80) }
        catch { }
        searching = false
    }
}
