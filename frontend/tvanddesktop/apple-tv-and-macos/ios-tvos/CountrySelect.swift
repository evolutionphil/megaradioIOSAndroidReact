// CountrySelect.swift — 1:1 port of `web-preview/src/components/CountrySelector.tsx`
// (mode="page"). Split layout:
//   • LEFT  (x:246): "Select Country" title + search bar + scrollable flag list.
//   • RIGHT (x:960): on-screen keyboard + language dropdown + hint row.
//
// Every coordinate / size / colour below is copied straight from the React
// source so the native tvOS screen matches the Tizen/web build pixel-for-pixel.

import SwiftUI

// MARK: - Focus targets

private enum CSFocus: Hashable {
    case country(Int)
    case key(Int, Int)
    case lang
    case langItem(Int)
}

struct CountrySelectPage: View {
    @EnvironmentObject var router: TVRouter
    @EnvironmentObject var country: CountryStore
    @StateObject private var catalog = CountryCatalog.shared

    @State private var searchQuery = ""
    @State private var activeLayoutIndex = 0
    @State private var dropdownOpen = false
    @FocusState private var focus: CSFocus?

    private var activeLayout: KbLayout { kbLayouts[activeLayoutIndex] }

    /// Countries filtered + sorted exactly like web. NO "Global" entry — a
    /// concrete country is always required (auto-detected, UK fallback).
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

    private var listFocused: Bool {
        if case .country = focus { return true }
        return false
    }

    var body: some View {
        Stage1920x1080 {
            AppSidebar(active: .countrySelect)

            // Logo (left:30 top:40, 164.421×57)
            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 40)

            // Title (left:246 top:42, 32px bold)
            Text("Select Country")
                .font(.ubuntu(32, .bold)).foregroundColor(.white)
                .offset(x: 246, y: 42)

            searchBar.offset(x: 246, y: 110)

            countryList
                .frame(width: 660, height: 1080 - 200 - 30, alignment: .topLeading)
                .focusSection()
                .offset(x: 246, y: 200)

            keyboardColumn.focusSection().offset(x: 960, y: 110)
        }
        .onAppear { catalog.loadIfNeeded() }
    }

    // MARK: Search bar (w:660 h:76)

    private var searchBar: some View {
        HStack(spacing: 14) {
            BrandImage(name: "search-icon")
                .frame(width: 31, height: 31).opacity(0.6)

            HStack(spacing: 0) {
                Text(searchQuery)
                    .font(.ubuntu(25.94, .medium)).foregroundColor(.white)
                    .lineLimit(1)
                Rectangle().fill(Theme.accent)
                    .frame(width: 3, height: 30).padding(.leading, 2)
                if searchQuery.isEmpty {
                    Text("Search countries...")
                        .font(.ubuntu(25.94, .medium))
                        .foregroundColor(.white.opacity(0.35))
                        .padding(.leading, 4)
                }
                Spacer(minLength: 0)
            }

            Text("\(catalog.countries.count)")
                .font(.ubuntu(16)).foregroundColor(.white.opacity(0.30))
        }
        .padding(.horizontal, 30)
        .frame(width: 660, height: 76)
        .background(
            RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.14))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(listFocused ? Theme.accent : Color(white: 0.443), lineWidth: 2.594)
        )
    }

    // MARK: Country list

    private var countryList: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: 6) {
                ForEach(Array(filtered.enumerated()), id: \.element.id) { idx, item in
                    CountryRow(
                        item: item,
                        isSelected: item.code == country.selectedCountryCode,
                        query: searchQuery,
                        isFocused: focus == .country(idx)
                    ) {
                        select(item)
                    }
                    .focused($focus, equals: .country(idx))
                }
            }
            .padding(.bottom, 40)
        }
    }

    // MARK: Keyboard column (w:700)

    private var keyboardColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(activeLayout.rows.enumerated()), id: \.offset) { rowIdx, row in
                let isActionRow = rowIdx == activeLayout.rows.count - 1
                HStack(spacing: isActionRow ? 10 : 6) {
                    ForEach(Array(row.enumerated()), id: \.offset) { colIdx, keyChar in
                        KeyButton(
                            keyChar: keyChar,
                            isFocused: focus == .key(rowIdx, colIdx)
                        ) {
                            press(keyChar)
                        }
                        .focused($focus, equals: .key(rowIdx, colIdx))
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
        Button { dropdownOpen.toggle() } label: {
            HStack {
                HStack(spacing: 12) {
                    FlagThumb(url: kbFlagURL(activeLayout.id), width: 32, height: 22)
                    Text(activeLayout.label).font(.ubuntu(20, .medium))
                }
                Spacer()
                Text("▼").font(.system(size: 16))
                    .rotationEffect(.degrees(dropdownOpen ? 180 : 0))
            }
            .foregroundColor(focus == .lang ? .white : .white.opacity(0.70))
            .padding(.horizontal, 24)
            .frame(width: 700, height: 60)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(focus == .lang ? Theme.accent : Color.white.opacity(0.08))
            )
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
                        activeLayoutIndex = idx
                        dropdownOpen = false
                        focus = .lang
                    } label: {
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
                    .buttonStyle(.tvTransparent)
                    .focused($focus, equals: .langItem(idx))
                }
            }
        }
        .frame(width: 700, height: 400)
        .background(
            RoundedRectangle(cornerRadius: 14).fill(Color(white: 0.118).opacity(0.98))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14).stroke(Theme.accent.opacity(0.3), lineWidth: 2)
        )
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

    // MARK: Actions

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

// MARK: - Country row

private struct CountryRow: View {
    let item: CountryItem
    let isSelected: Bool
    let query: String
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
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
            .background(
                RoundedRectangle(cornerRadius: 12).fill(rowBackground)
            )
            .shadow(color: isFocused ? Theme.accent.opacity(0.35) : .clear, radius: 20)
        }
        .buttonStyle(.tvTransparent)
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

    /// Renders the country name with the matched substring tinted pink.
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
