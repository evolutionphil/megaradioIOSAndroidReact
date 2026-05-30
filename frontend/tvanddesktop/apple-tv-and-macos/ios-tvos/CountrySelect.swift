// CountrySelect.swift — 1:1 port of `web-preview/src/components/CountrySelector.tsx`
// (mode="page"), rebuilt on the EXPLICIT INDEX-BASED FOCUS ENGINE so the remote
// behaves EXACTLY like the Tizen build:
//
//   • The whole page is ONE focusable container. We intercept `onMoveCommand`
//     (arrows) and the select press (`onTapGesture`) and drive a manual focus
//     model — we do NOT rely on the geometric tvOS focus engine.
//   • Focus is rendered from the model (zone + indices), so a RIGHT press from
//     ANY country row jumps to the keyboard, a LEFT press always returns to the
//     sidebar, etc. — regardless of on-screen geometry.

import SwiftUI

private enum CZone { case sidebar, list, key, lang, langItem }

struct CountrySelectPage: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var country: CountryStore
    @StateObject private var catalog = CountryCatalog.shared

    @State private var searchQuery = ""
    @State private var activeLayoutIndex = 0
    @State private var dropdownOpen = false

    // Explicit focus model.
    @State private var zone: CZone = .list
    @State private var sidebarIdx = 4          // "Country" is the active page
    @State private var listIdx = 0
    @State private var keyRow = 0
    @State private var keyCol = 0
    @State private var lastKeyRow = 0
    @State private var lastKeyCol = 0
    @State private var langItemIdx = 0

    private var activeLayout: KbLayout { kbLayouts[activeLayoutIndex] }
    private var rows: [[String]] { activeLayout.rows }
    private func rowLen(_ r: Int) -> Int { rows.indices.contains(r) ? rows[r].count : 0 }
    private var listFocused: Bool { zone == .list }

    /// Countries filtered + sorted exactly like web. NO "Global" entry.
    private var filtered: [CountryItem] {
        let q = searchQuery.lowercased()
        var list = catalog.countries
        if !q.isEmpty {
            list = list.filter { $0.name.lowercased().contains(q) }
                .sorted { a, b in
                    let aS = a.name.lowercased().hasPrefix(q)
                    let bS = b.name.lowercased().hasPrefix(q)
                    if aS != bS { return aS }
                    return a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
                }
        }
        return list
    }

    var body: some View {
        Stage1920x1080 {
            EngineSidebar(activeIndex: 4, focusedIndex: zone == .sidebar ? sidebarIdx : nil)

            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 40)

            Text("Select Country")
                .font(.ubuntu(32, .bold)).foregroundColor(.white)
                .offset(x: 246, y: 42)

            searchBar.offset(x: 246, y: 110)

            countryList
                .frame(width: 660, height: 1080 - 200 - 30, alignment: .topLeading)
                .offset(x: 246, y: 200)

            keyboardColumn.offset(x: 960, y: 110)
        }
        .remoteControl { handleKey($0) }
        .onAppear {
            catalog.loadIfNeeded()
            zone = .list
        }
    }

    // MARK: Search bar

    private var searchBar: some View {
        HStack(spacing: 14) {
            BrandImage(name: "search-icon").frame(width: 31, height: 31).opacity(0.6)
            HStack(spacing: 0) {
                Text(searchQuery).font(.ubuntu(25.94, .medium)).foregroundColor(.white).lineLimit(1)
                Rectangle().fill(Theme.accent).frame(width: 3, height: 30).padding(.leading, 2)
                if searchQuery.isEmpty {
                    Text("Search countries...")
                        .font(.ubuntu(25.94, .medium))
                        .foregroundColor(.white.opacity(0.35)).padding(.leading, 4)
                }
                Spacer(minLength: 0)
            }
            Text("\(catalog.countries.count)")
                .font(.ubuntu(16)).foregroundColor(.white.opacity(0.30))
        }
        .padding(.horizontal, 30)
        .frame(width: 660, height: 76)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.14)))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(listFocused ? Theme.accent : Color(white: 0.443), lineWidth: 2.594)
        )
    }

    // MARK: Country list

    private var countryList: some View {
        let count = filtered.count
        let size = 8
        let start = windowStart(focused: min(listIdx, max(0, count - 1)),
                                count: count, size: size, lead: 3)
        let end = min(start + size, count)
        return VStack(spacing: 6) {
            ForEach(Array(start..<end), id: \.self) { idx in
                CountryRow(
                    item: filtered[idx],
                    isSelected: filtered[idx].code == country.selectedCountryCode,
                    query: searchQuery,
                    isFocused: zone == .list && listIdx == idx
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }

    // MARK: Keyboard column (w:700)

    private var keyboardColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.offset) { rowIdx, row in
                let isActionRow = rowIdx == rows.count - 1
                HStack(spacing: isActionRow ? 10 : 6) {
                    ForEach(Array(row.enumerated()), id: \.offset) { colIdx, keyChar in
                        KeyButtonLabel(
                            keyChar: keyChar,
                            isFocused: zone == .key && keyRow == rowIdx && keyCol == colIdx
                        )
                    }
                }
                .padding(.top, isActionRow ? 14 : 0)
                .padding(.bottom, isActionRow ? 0 : 6)
            }

            languageButton.padding(.top, 20)
            hintRow.padding(.top, 16)
        }
        .frame(width: 700, alignment: .leading)
    }

    private var languageButton: some View {
        HStack {
            HStack(spacing: 12) {
                FlagThumb(url: kbFlagURL(activeLayout.id), width: 32, height: 22)
                Text(activeLayout.label).font(.ubuntu(20, .medium))
            }
            Spacer()
            Text("▼").font(.system(size: 16))
                .rotationEffect(.degrees(dropdownOpen ? 180 : 0))
        }
        .foregroundColor(zone == .lang ? .white : .white.opacity(0.70))
        .padding(.horizontal, 24)
        .frame(width: 700, height: 60)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(zone == .lang ? Theme.accent : Color.white.opacity(0.08))
        )
        .shadow(color: zone == .lang ? Theme.accent.opacity(0.4) : .clear, radius: 14)
        .overlay(alignment: .topLeading) {
            if dropdownOpen { languageDropdown.offset(y: -416) }
        }
    }

    private var languageDropdown: some View {
        let size = 6
        let start = windowStart(focused: langItemIdx, count: kbLayouts.count, size: size, lead: 2)
        let end = min(start + size, kbLayouts.count)
        return VStack(spacing: 0) {
            ForEach(Array(start..<end), id: \.self) { idx in
                let layout = kbLayouts[idx]
                let isActive = idx == activeLayoutIndex
                let isFoc = zone == .langItem && langItemIdx == idx
                HStack(spacing: 14) {
                    FlagThumb(url: kbFlagURL(layout.id), width: 30, height: 20)
                    Text(layout.label).font(.ubuntu(19, .medium))
                    Spacer()
                    if isActive && !isFoc {
                        Text("✓").foregroundColor(Theme.accent).font(.system(size: 16))
                    }
                }
                .foregroundColor(.white.opacity(isFoc || isActive ? 1 : 0.70))
                .padding(.horizontal, 24)
                .frame(width: 700, height: 58)
                .background(
                    isFoc ? Theme.accent
                    : isActive ? Theme.accent.opacity(0.15)
                    : Color.clear
                )
            }
        }
        .frame(width: 700, alignment: .top)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color(white: 0.118).opacity(0.98)))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.accent.opacity(0.3), lineWidth: 2))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var hintRow: some View {
        HStack(spacing: 20) {
            hintChip(symbol: "←", label: "Results")
            hintChip(symbol: "OK", label: "Type")
        }
        .padding(.leading, 4)
    }

    private func hintChip(symbol: String, label: String) -> some View {
        HStack(spacing: 6) {
            Text(symbol)
                .font(.system(size: 14)).foregroundColor(.white.opacity(0.6))
                .frame(width: 28, height: 28)
                .background(RoundedRectangle(cornerRadius: 6).fill(Color.white.opacity(0.14)))
            Text(label).font(.ubuntu(16)).foregroundColor(.white.opacity(0.30))
        }
    }

    // MARK: - Focus engine

    @discardableResult
    private func handleKey(_ key: RemoteKey) -> Bool {
        switch key {
        case .up, .down, .left, .right: move(key)
        case .select: activate()
        case .back:
            if dropdownOpen { dropdownOpen = false; zone = .lang }
            else { router.go(.discover) }
        case .playPause: return false
        }
        return true
    }

    private func move(_ dir: RemoteKey) {
        switch zone {
        case .sidebar:
            switch dir {
            case .up:    sidebarIdx = max(0, sidebarIdx - 1)
            case .down:  sidebarIdx = min(engineSidebarItems.count - 1, sidebarIdx + 1)
            case .right: zone = .list
            default: break
            }
        case .list:
            switch dir {
            case .up:    listIdx = max(0, listIdx - 1)
            case .down:  listIdx = min(max(0, filtered.count - 1), listIdx + 1)
            case .left:  zone = .sidebar
            case .right:
                zone = .key
                keyRow = min(lastKeyRow, rows.count - 1)
                keyCol = min(lastKeyCol, max(0, rowLen(keyRow) - 1))
            default: break
            }
        case .key:
            switch dir {
            case .up:
                if keyRow > 0 { keyRow -= 1; keyCol = min(keyCol, rowLen(keyRow) - 1) }
            case .down:
                if keyRow < rows.count - 1 {
                    keyRow += 1; keyCol = min(keyCol, rowLen(keyRow) - 1)
                } else {
                    lastKeyRow = keyRow; lastKeyCol = keyCol; zone = .lang
                }
            case .left:
                if keyCol > 0 { keyCol -= 1 }
                else { lastKeyRow = keyRow; lastKeyCol = keyCol; zone = .list }
            case .right:
                if keyCol < rowLen(keyRow) - 1 { keyCol += 1 }
            default: break
            }
        case .lang:
            switch dir {
            case .up:
                zone = .key
                keyRow = rows.count - 1
                keyCol = min(lastKeyCol, max(0, rowLen(keyRow) - 1))
            case .left:
                zone = .list
            case .down:
                if dropdownOpen { zone = .langItem; langItemIdx = activeLayoutIndex }
            default: break
            }
        case .langItem:
            switch dir {
            case .up:   langItemIdx = max(0, langItemIdx - 1)
            case .down: langItemIdx = min(kbLayouts.count - 1, langItemIdx + 1)
            default: break
            }
        }
    }

    private func activate() {
        switch zone {
        case .sidebar:
            let item = engineSidebarItems[sidebarIdx]
            if item.id == "help" { HelpStore.shared.open() }
            else if let r = item.route { router.go(r) }
        case .list:
            if filtered.indices.contains(listIdx) { select(filtered[listIdx]) }
        case .key:
            press(rows[keyRow][keyCol])
            listIdx = 0
        case .lang:
            dropdownOpen.toggle()
            if dropdownOpen { zone = .langItem; langItemIdx = activeLayoutIndex }
        case .langItem:
            activeLayoutIndex = langItemIdx
            dropdownOpen = false
            zone = .lang
        }
    }

    private func press(_ key: String) {
        switch key {
        case "SPACE":  searchQuery += " "
        case "DELETE": if !searchQuery.isEmpty { searchQuery.removeLast() }
        case "CLEAR":  searchQuery = ""
        default:       searchQuery += key.lowercased()
        }
    }

    private func select(_ item: CountryItem) {
        country.set(code: item.code, name: item.name, flag: item.code)
        router.go(.discover)
    }
}

// MARK: - Country row (visual only — no focus state)

private struct CountryRow: View {
    let item: CountryItem
    let isSelected: Bool
    let query: String
    let isFocused: Bool

    var body: some View {
        HStack(spacing: 16) {
            flag
            highlightedName
                .font(.ubuntu(isFocused ? 30 : 26, .medium))
                .foregroundColor(.white)
                .lineLimit(1)
            Spacer(minLength: 0)
            if isSelected && !isFocused {
                Text("✓").font(.system(size: 16)).foregroundColor(Theme.accent)
            }
        }
        .padding(.horizontal, 24)
        .frame(height: 110)
        .background(RoundedRectangle(cornerRadius: 12).fill(rowBackground))
        .shadow(color: isFocused ? Theme.accent.opacity(0.35) : .clear, radius: 20)
    }

    private var rowBackground: Color {
        if isFocused { return Theme.accent }
        if isSelected { return Theme.accent.opacity(0.15) }
        return Color.white.opacity(0.05)
    }

    @ViewBuilder private var flag: some View {
        FlagThumb(url: item.flagURL,
                  width: isFocused ? 52 : 46,
                  height: isFocused ? 39 : 34,
                  cornerRadius: 6)
    }

    private var highlightedName: Text {
        guard !query.isEmpty,
              let range = item.name.range(of: query, options: .caseInsensitive)
        else { return Text(item.name) }
        let pre = String(item.name[item.name.startIndex..<range.lowerBound])
        let mid = String(item.name[range])
        let post = String(item.name[range.upperBound...])
        return Text(pre) + Text(mid).foregroundColor(Theme.accent) + Text(post)
    }
}
