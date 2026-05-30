// TVKeyboard.swift — Shared on-screen keyboard + flag components.
//
// Used by both CountrySelect and Search (web `CountrySelector.tsx` /
// `Search.tsx` share the exact same keyboard markup). Keeping a single
// definition guarantees the two screens stay pixel-identical.

import SwiftUI

// MARK: - Keyboard layouts (identical to KEYBOARD_LAYOUTS in the web source)

struct KbLayout: Identifiable {
    let id: String
    let label: String
    let rows: [[String]]
}

let kbLayouts: [KbLayout] = [
    .init(id: "en", label: "English", rows: [["A","B","C","D","E","F","G"],["H","I","J","K","L","M","N"],["O","P","Q","R","S","T","U"],["V","W","X","Y","Z","-","'"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "tr", label: "Türkçe", rows: [["A","B","C","Ç","D","E","F"],["G","Ğ","H","I","İ","J","K"],["L","M","N","O","Ö","P","R"],["S","Ş","T","U","Ü","V","Y"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "ar", label: "العربية", rows: [["ا","ب","ت","ث","ج","ح","خ"],["د","ذ","ر","ز","س","ش","ص"],["ض","ط","ظ","ع","غ","ف","ق"],["ك","ل","م","ن","ه","و","ي"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "ru", label: "Русский", rows: [["А","Б","В","Г","Д","Е","Ж"],["З","И","К","Л","М","Н","О"],["П","Р","С","Т","У","Ф","Х"],["Ц","Ч","Ш","Щ","Э","Ю","Я"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "de", label: "Deutsch", rows: [["A","B","C","D","E","F","G"],["H","I","J","K","L","M","N"],["O","P","Q","R","S","T","U"],["V","W","X","Y","Z","Ä","Ö"],["Ü","ß","SPACE","DELETE","CLEAR"]]),
    .init(id: "fr", label: "Français", rows: [["A","B","C","D","E","F","G"],["H","I","J","K","L","M","N"],["O","P","Q","R","S","T","U"],["V","W","X","Y","Z","É","È"],["Ê","Ç","SPACE","DELETE","CLEAR"]]),
    .init(id: "es", label: "Español", rows: [["A","B","C","D","E","F","G"],["H","I","J","K","L","M","N"],["Ñ","O","P","Q","R","S","T"],["U","V","W","X","Y","Z","-"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "ja", label: "日本語", rows: [["あ","い","う","え","お","か","き"],["く","け","こ","さ","し","す","せ"],["そ","た","ち","つ","て","と","な"],["に","ぬ","ね","の","は","ひ","ふ"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "zh", label: "中文", rows: [["A","B","C","D","E","F","G"],["H","I","J","K","L","M","N"],["O","P","Q","R","S","T","U"],["V","W","X","Y","Z","-","'"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "ko", label: "한국어", rows: [["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅅ"],["ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],["ㅏ","ㅑ","ㅓ","ㅕ","ㅗ","ㅛ","ㅜ"],["ㅠ","ㅡ","ㅣ","ㄲ","ㄸ","ㅃ","ㅆ"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "el", label: "Ελληνικά", rows: [["Α","Β","Γ","Δ","Ε","Ζ","Η"],["Θ","Ι","Κ","Λ","Μ","Ν","Ξ"],["Ο","Π","Ρ","Σ","Τ","Υ","Φ"],["Χ","Ψ","Ω","-","'"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "hi", label: "हिन्दी", rows: [["अ","आ","इ","ई","उ","ऊ","ए"],["क","ख","ग","घ","च","छ","ज"],["ट","ठ","ड","ढ","त","थ","द"],["प","फ","ब","म","र","ल","स"],["SPACE","DELETE","CLEAR"]]),
    .init(id: "th", label: "ไทย", rows: [["ก","ข","ค","ง","จ","ช","ซ"],["ด","ต","ถ","ท","น","บ","ป"],["พ","ม","ย","ร","ล","ว","ส"],["ห","อ","ะ","า","ิ","ี","ุ"],["SPACE","DELETE","CLEAR"]]),
]

func kbFlagURL(_ id: String) -> URL? {
    let map = ["en":"gb","tr":"tr","ar":"sa","ru":"ru","de":"de","fr":"fr","es":"es","ja":"jp","zh":"cn","ko":"kr","el":"gr","hi":"in","th":"th"]
    return URL(string: "https://flagcdn.com/w40/\(map[id] ?? "gb").png")
}

// MARK: - Keyboard key (h:68; normal w:92; SPACE flex; DELETE/CLEAR w:170)

struct KeyButton: View {
    let keyChar: String
    let isFocused: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            KeyButtonLabel(keyChar: keyChar, isFocused: isFocused)
        }
        .buttonStyle(.tvTransparent)
    }
}

/// Visual-only key (non-focusable). Used by the explicit-focus engine pages
/// that render their own highlight from a focus model.
struct KeyButtonLabel: View {
    let keyChar: String
    let isFocused: Bool

    private var isAction: Bool { keyChar == "SPACE" || keyChar == "DELETE" || keyChar == "CLEAR" }
    private var label: String {
        switch keyChar {
        case "DELETE": return "⌫"
        case "SPACE":  return "SPACE"
        case "CLEAR":  return "CLEAR"
        default:       return keyChar
        }
    }

    var body: some View {
        labelView
            .background(RoundedRectangle(cornerRadius: 12).fill(background))
            .shadow(color: isFocused ? Theme.accent.opacity(0.5) : .clear, radius: 25)
            .scaleEffect(isFocused ? 1.05 : 1)
    }

    @ViewBuilder private var labelView: some View {
        let text = Text(label)
            .font(.ubuntu(isFocused ? 24 : (isAction ? 18 : 22), .medium))
            .foregroundColor(isFocused ? .white : (isAction ? .white.opacity(0.70) : .white))
        if keyChar == "SPACE" {
            text.frame(maxWidth: .infinity).frame(height: 68)
        } else if keyChar == "DELETE" || keyChar == "CLEAR" {
            text.frame(width: 170, height: 68)
        } else {
            text.frame(width: 92, height: 68)
        }
    }

    private var background: Color {
        if isFocused { return Theme.accent }
        if isAction { return Color.white.opacity(0.08) }
        return Color.white.opacity(0.14)
    }
}

// MARK: - Flag thumbnail (flagcdn)

struct FlagThumb: View {
    let url: URL?
    let width: CGFloat
    let height: CGFloat
    var cornerRadius: CGFloat = 2

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let img): img.resizable().scaledToFill()
            default: Color(white: 0.59)
            }
        }
        .frame(width: width, height: height)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    }
}
