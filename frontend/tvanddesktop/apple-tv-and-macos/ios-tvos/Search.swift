// Search.swift — 1:1 port of `web-preview/src/pages/Search.tsx`.
//
// Layout (1920×1080), gradient bg #1a1a1a→#0e0e0e:
//   • Logo (30,64) + "Search" title (246,58).
//   • LEFT  (x:246): search bar (660×76) + scrollable results list (h:110 rows).
//   • RIGHT (x:960,w:700): on-screen keyboard + language dropdown +
//     "Recently Played" grid (2 rows × 4 cards).
// NOTE: the web Search page has NO country/login header — only logo + title.

import SwiftUI

private enum SearchFocus: Hashable {
    case key(Int, Int)
    case result(Int)
    case lang
    case langItem(Int)
    case recent(Int)
}

struct SearchPage: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var player: AudioPlayer
    @StateObject private var settings = SettingsStore.shared

    @State private var query = ""
    @State private var results: [Station] = []
    @State private var recent: [Station] = []
    @State private var searching = false
    @State private var debounceTask: Task<Void, Never>?

    @State private var activeLayoutIndex = 0
    @State private var dropdownOpen = false
    @FocusState private var focus: SearchFocus?

    private var activeLayout: KbLayout { kbLayouts[activeLayoutIndex] }
    private var visibleResults: [Station] { Array(results.prefix(8)) }

    private var resultFocused: Bool {
        if case .result = focus { return true }
        return false
    }

    var body: some View {
        Stage1920x1080 {
            LinearGradient(colors: [Color(white: 0.102), Theme.background],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
                .frame(width: 1920, height: 1080)

            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            AppSidebar(active: .search)

            Text("Search").font(.ubuntu(32, .bold)).foregroundColor(.white)
                .offset(x: 246, y: 58)

            searchBar.offset(x: 246, y: 110)

            resultsList
                .frame(width: 660, height: 1080 - 200 - 30, alignment: .topLeading)
                .offset(x: 246, y: 200)

            rightColumn.offset(x: 960, y: 110)
        }
        .onAppear {
            activeLayoutIndex = max(0, kbLayouts.firstIndex { $0.id == settings.keyboardId } ?? 0)
            Task { await loadRecent() }
        }
    }

    // MARK: Search bar

    private var searchBar: some View {
        HStack(spacing: 14) {
            BrandImage(name: "search-icon").frame(width: 31, height: 31).opacity(0.6)
            HStack(spacing: 0) {
                Text(query).font(.ubuntu(25.94, .medium)).foregroundColor(.white).lineLimit(1)
                Rectangle().fill(Theme.accent).frame(width: 3, height: 30).padding(.leading, 2)
                if query.isEmpty {
                    Text("Search...").font(.ubuntu(25.94, .medium))
                        .foregroundColor(.white.opacity(0.35)).padding(.leading, 4)
                }
                Spacer(minLength: 0)
            }
            if !visibleResults.isEmpty {
                Text("\(visibleResults.count)").font(.ubuntu(16)).foregroundColor(.white.opacity(0.3))
            }
        }
        .padding(.horizontal, 30)
        .frame(width: 660, height: 76)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.14)))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(resultFocused ? Theme.accent : Color(white: 0.443), lineWidth: 2.594)
        )
    }

    // MARK: Results list

    private var resultsList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if query.count > 0 && searching && visibleResults.isEmpty {
                VStack(spacing: 20) {
                    ProgressView().tint(Theme.accent).scaleEffect(1.6)
                    Text("Searching...").font(.ubuntu(20)).foregroundColor(.white.opacity(0.4))
                }
                .frame(maxWidth: .infinity).padding(.top, 80)
            } else if query.count > 0 && !searching && visibleResults.isEmpty {
                Text("No stations found for \"\(query)\"")
                    .font(.ubuntu(20)).foregroundColor(.white.opacity(0.5))
                    .frame(maxWidth: .infinity).padding(.top, 40)
            } else {
                LazyVStack(spacing: 6) {
                    ForEach(Array(visibleResults.enumerated()), id: \.element.id) { idx, s in
                        SearchResultRow(station: s, query: query, isFocused: focus == .result(idx)) {
                            player.play(s); router.go(.radioPlaying)
                        }
                        .focused($focus, equals: .result(idx))
                    }
                }
                .padding(.bottom, 40)
            }
        }
    }

    // MARK: Right column — keyboard + lang + recently played

    private var rightColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(activeLayout.rows.enumerated()), id: \.offset) { rowIdx, row in
                let isActionRow = rowIdx == activeLayout.rows.count - 1
                HStack(spacing: isActionRow ? 10 : 6) {
                    ForEach(Array(row.enumerated()), id: \.offset) { colIdx, keyChar in
                        KeyButton(keyChar: keyChar, isFocused: focus == .key(rowIdx, colIdx)) {
                            press(keyChar)
                        }
                        .focused($focus, equals: .key(rowIdx, colIdx))
                    }
                }
                .padding(.top, isActionRow ? 14 : 0)
                .padding(.bottom, isActionRow ? 0 : 6)
            }

            languageButton.padding(.top, 20)

            if !recent.isEmpty {
                Text("Recently Played").font(.ubuntu(24, .bold)).foregroundColor(.white)
                    .padding(.top, 20).padding(.bottom, 14)
                recentGrid
            }
        }
        .frame(width: 700, alignment: .leading)
    }

    private var languageButton: some View {
        Button { dropdownOpen.toggle() } label: {
            HStack {
                HStack(spacing: 12) {
                    FlagThumb(url: kbFlagURL(activeLayout.id), width: 32, height: 22)
                    Text(activeLayout.label).font(.ubuntu(20, .medium))
                }
                Spacer()
                Text("▼").font(.system(size: 16)).rotationEffect(.degrees(dropdownOpen ? 180 : 0))
            }
            .foregroundColor(focus == .lang ? .white : .white.opacity(0.7))
            .padding(.horizontal, 24).frame(width: 700, height: 60)
            .background(RoundedRectangle(cornerRadius: 12)
                .fill(focus == .lang ? Theme.accent : Color.white.opacity(0.08)))
            .shadow(color: focus == .lang ? Theme.accent.opacity(0.4) : .clear, radius: 14)
        }
        .buttonStyle(.tvTransparent)
        .focused($focus, equals: .lang)
        .overlay(alignment: .topLeading) {
            if dropdownOpen { languageDropdown.offset(y: -416) }
        }
    }

    private var languageDropdown: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 0) {
                ForEach(Array(kbLayouts.enumerated()), id: \.element.id) { idx, layout in
                    let isActive = idx == activeLayoutIndex
                    let isFoc = focus == .langItem(idx)
                    Button {
                        activeLayoutIndex = idx; settings.keyboardId = layout.id
                        dropdownOpen = false; focus = .lang
                    } label: {
                        HStack(spacing: 14) {
                            FlagThumb(url: kbFlagURL(layout.id), width: 30, height: 20)
                            Text(layout.label).font(.ubuntu(19, .medium))
                            Spacer()
                            if isActive && !isFoc {
                                Text("✓").foregroundColor(Theme.accent).font(.system(size: 16))
                            }
                        }
                        .foregroundColor(.white.opacity(isFoc || isActive ? 1 : 0.7))
                        .padding(.horizontal, 24).frame(width: 700, height: 58)
                        .background(isFoc ? Theme.accent : (isActive ? Theme.accent.opacity(0.15) : Color.clear))
                    }
                    .buttonStyle(.tvTransparent)
                    .focused($focus, equals: .langItem(idx))
                }
            }
        }
        .frame(width: 700, height: 400)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color(white: 0.118).opacity(0.98)))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.accent.opacity(0.3), lineWidth: 2))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var recentGrid: some View {
        let items = Array(recent.prefix(8))
        return LazyVGrid(columns: Array(repeating: GridItem(.fixed(162), spacing: 14), count: 4), spacing: 14) {
            ForEach(Array(items.enumerated()), id: \.element.id) { idx, s in
                RecentSearchCard(station: s, isFocused: focus == .recent(idx)) {
                    player.play(s); router.go(.radioPlaying)
                }
                .focused($focus, equals: .recent(idx))
            }
        }
        .frame(width: 690, alignment: .leading)
    }

    // MARK: Actions

    private func press(_ key: String) {
        switch key {
        case "SPACE":  query += " "
        case "DELETE": if !query.isEmpty { query.removeLast() }
        case "CLEAR":  query = ""
        default:       query += key.lowercased()
        }
        scheduleSearch()
    }

    private func scheduleSearch() {
        debounceTask?.cancel()
        let q = query
        if q.trimmingCharacters(in: .whitespaces).count < 3 { results = []; searching = false; return }
        searching = true
        debounceTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            await runSearch(q)
        }
    }

    private func runSearch(_ q: String) async {
        do {
            let res = try await APIClient.shared.searchStations(q, limit: 50)
            guard query == q else { return }
            let lower = q.lowercased()
            results = res.sorted { a, b in
                let aExact = a.name.lowercased() == lower, bExact = b.name.lowercased() == lower
                if aExact != bExact { return aExact }
                let aStarts = a.name.lowercased().hasPrefix(lower), bStarts = b.name.lowercased().hasPrefix(lower)
                if aStarts != bStarts { return aStarts }
                return (a.votes ?? 0) > (b.votes ?? 0)
            }
        } catch { }
        searching = false
    }

    private func loadRecent() async {
        if let pop = try? await APIClient.shared.fetchPopularStations(country: nil, limit: 8) {
            recent = pop
        }
    }
}

// MARK: - Result row (h:110)

private struct SearchResultRow: View {
    let station: Station
    let query: String
    let isFocused: Bool
    let onTap: () -> Void

    private var category: String {
        station.tags?.split(separator: ",").first.map { String($0).trimmingCharacters(in: .whitespaces) }
            ?? station.country ?? "Radio"
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6).fill(Color.white.opacity(0.1))
                    AsyncImage(url: station.artworkURL) { phase in
                        if let img = phase.image { img.resizable().scaledToFill() }
                        else { BrandImage(name: "fallback-favicon").padding(8) }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .frame(width: isFocused ? 52 : 46, height: isFocused ? 52 : 46)

                VStack(alignment: .leading, spacing: 2) {
                    highlightedName
                        .font(.ubuntu(isFocused ? 30 : 26, .medium)).lineLimit(1)
                    Text(category)
                        .font(.ubuntu(isFocused ? 20 : 18, .light))
                        .foregroundColor(isFocused ? .white.opacity(0.8) : .white.opacity(0.5))
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 24).frame(height: 110)
            .background(RoundedRectangle(cornerRadius: 12)
                .fill(isFocused ? Theme.accent : Color.white.opacity(0.05)))
            .shadow(color: isFocused ? Theme.accent.opacity(0.35) : .clear, radius: 20)
        }
        .buttonStyle(.tvTransparent)
    }

    private var highlightedName: Text {
        let name = station.name
        if isFocused { return Text(name).foregroundColor(.white) }
        guard !query.isEmpty,
              let range = name.range(of: query, options: .caseInsensitive)
        else { return Text(name).foregroundColor(Color(white: 0.647)) }
        let pre = String(name[name.startIndex..<range.lowerBound])
        let mid = String(name[range])
        let post = String(name[range.upperBound...])
        return Text(pre).foregroundColor(Color(white: 0.647))
            + Text(mid).foregroundColor(.white)
            + Text(post).foregroundColor(Color(white: 0.647))
    }
}

// MARK: - Recently-played card (w:162, image 110×110)

private struct RecentSearchCard: View {
    let station: Station
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10).fill(.white)
                    AsyncImage(url: station.artworkURL) { phase in
                        if let img = phase.image { img.resizable().scaledToFill() }
                        else { BrandImage(name: "fallback-favicon").padding(20) }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .frame(width: 110, height: 110)
                Text(station.name).font(.ubuntu(18, .medium)).foregroundColor(.white)
                    .lineLimit(1).frame(maxWidth: .infinity)
            }
            .padding(12).frame(width: 162)
            .background(RoundedRectangle(cornerRadius: 12)
                .fill(isFocused ? Theme.accent : Color.white.opacity(0.08)))
            .shadow(color: isFocused ? Theme.accent.opacity(0.5) : .clear, radius: 20)
            .scaleEffect(isFocused ? 1.05 : 1)
        }
        .buttonStyle(.tvTransparent)
    }
}
