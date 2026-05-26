// AuthStore.swift — Pairing-code login flow + JWT persistence

import Foundation
import Combine

@MainActor
final class AuthStore: ObservableObject {
    static let shared = AuthStore()

    @Published private(set) var token: String?
    @Published private(set) var user: TVUser?
    @Published private(set) var pendingCode: String?
    @Published private(set) var lastError: String?

    private let tokenKey = "megaradio.tv.token"
    private let userKey = "megaradio.tv.user"
    private let deviceIdKey = "megaradio.tv.deviceId"
    private var pollTimer: Timer?

    var isAuthenticated: Bool { token != nil }
    var deviceId: String {
        if let d = UserDefaults.standard.string(forKey: deviceIdKey) { return d }
        let new = UUID().uuidString
        UserDefaults.standard.set(new, forKey: deviceIdKey)
        return new
    }

    private init() {
        // Restore previous session
        if let t = UserDefaults.standard.string(forKey: tokenKey) {
            self.token = t
        }
        if let data = UserDefaults.standard.data(forKey: userKey),
           let u = try? JSONDecoder().decode(TVUser.self, from: data) {
            self.user = u
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Pairing-code flow (matches the existing TV web preview)
    // ─────────────────────────────────────────────────────────────────

    func startPairing() async {
        do {
            lastError = nil
            let resp = try await APIClient.shared.requestTVCode(deviceId: deviceId)
            pendingCode = resp.code
            beginPolling()
        } catch {
            lastError = error.localizedDescription
            pendingCode = nil
        }
    }

    func stopPairing() {
        pollTimer?.invalidate()
        pollTimer = nil
        pendingCode = nil
    }

    private func beginPolling() {
        pollTimer?.invalidate()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.pollOnce()
            }
        }
    }

    private func pollOnce() async {
        guard let code = pendingCode else { return }
        do {
            let resp = try await APIClient.shared.checkTVCode(code, deviceId: deviceId)
            switch resp.status {
            case "activated":
                if let t = resp.token {
                    self.token = t
                    UserDefaults.standard.set(t, forKey: tokenKey)
                }
                if let u = resp.user, let data = try? JSONEncoder().encode(u) {
                    self.user = u
                    UserDefaults.standard.set(data, forKey: userKey)
                }
                stopPairing()
            case "expired":
                lastError = "Code expired, please try again"
                stopPairing()
            default:
                break
            }
        } catch {
            // Silent — keep polling
        }
    }

    func signOut() {
        token = nil
        user = nil
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
    }
}
