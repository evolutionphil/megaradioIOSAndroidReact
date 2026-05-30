// RemoteControl.swift — UIKit-level Siri Remote capture for the explicit focus
// engine.
//
// WHY: On tvOS a SwiftUI `ScrollView` is implicitly focusable and STEALS focus,
// so `.onMoveCommand` on a container never fires reliably. Apple's supported
// lower-level hook is `UIResponder.pressesBegan(_:with:)`. We wrap a focusable
// `UIView` in `UIViewRepresentable`, make it the sole focusable element on the
// page, and forward every D-pad / select / menu press into our SwiftUI focus
// model. This gives DETERMINISTIC, Tizen-identical navigation independent of
// on-screen geometry.
//
// USAGE: the page content must contain NO focusable SwiftUI elements (no
// Buttons, no ScrollViews driving focus). Render everything as plain views with
// highlights from the model, and attach `.remoteControl { key in ... }`.

import SwiftUI
import UIKit

enum RemoteKey { case up, down, left, right, select, back, playPause }

final class RemoteCaptureUIView: UIView {
    var onKey: ((RemoteKey) -> Bool)?

    override var canBecomeFocused: Bool { true }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            setNeedsFocusUpdate()
            updateFocusIfNeeded()
        }
    }

    override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        var unhandled = Set<UIPress>()
        for press in presses {
            let key: RemoteKey?
            switch press.type {
            case .upArrow:    key = .up
            case .downArrow:  key = .down
            case .leftArrow:  key = .left
            case .rightArrow: key = .right
            case .select:     key = .select
            case .menu:       key = .back
            case .playPause:  key = .playPause
            @unknown default: key = nil
            }
            if let key, onKey?(key) == true { continue }
            unhandled.insert(press)
        }
        if !unhandled.isEmpty { super.pressesBegan(unhandled, with: event) }
    }
}

struct RemoteControlLayer: UIViewRepresentable {
    let onKey: (RemoteKey) -> Bool

    func makeUIView(context: Context) -> RemoteCaptureUIView {
        let v = RemoteCaptureUIView()
        v.onKey = onKey
        return v
    }

    func updateUIView(_ uiView: RemoteCaptureUIView, context: Context) {
        uiView.onKey = onKey
    }
}

extension View {
    /// Capture Siri-Remote presses at the UIKit level. Return `true` from the
    /// closure to consume a key, `false` to let the system handle it (e.g. let
    /// Menu exit the app on the root screen).
    func remoteControl(_ onKey: @escaping (RemoteKey) -> Bool) -> some View {
        overlay(RemoteControlLayer(onKey: onKey))
    }
}

// MARK: - Sliding-window helper

/// Given a focused index, returns the start index of a window of `size` rows so
/// the focused row stays roughly centered (clamped at both ends). Replaces
/// ScrollView-based virtualization with a focus-driven window — no native
/// scrolling, so no focus stealing.
func windowStart(focused: Int, count: Int, size: Int, lead: Int) -> Int {
    guard count > size else { return 0 }
    let s = focused - lead
    return max(0, min(s, count - size))
}
