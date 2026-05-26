// Settings.swift — Port of `web-preview/src/pages/Settings.tsx` + `Login.tsx`.

import SwiftUI

struct SettingsPage: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var router: TVRouter

    var body: some View {
        Stage1920x1080 {
            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            AppSidebar(active: .settings)

            VStack(alignment: .leading, spacing: 40) {
                Text("Account").font(.ubuntu(56, .bold)).foregroundColor(.white)

                if auth.isAuthenticated {
                    accountCard
                } else {
                    notSignedInCard
                }
            }
            .frame(width: 1500, height: 910, alignment: .topLeading)
            .offset(x: 192, y: 170)
        }
    }

    private var accountCard: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Signed in as")
                .font(.ubuntu(22))
                .foregroundColor(Theme.textSecondary)
            Text(auth.user?.displayName ?? auth.user?.email ?? "MegaRadio user")
                .font(.ubuntu(40, .bold))
                .foregroundColor(.white)
            Button(role: .destructive) {
                auth.signOut()
            } label: {
                Text("Sign Out")
                    .font(.ubuntu(24, .bold))
                    .padding(.horizontal, 44)
                    .padding(.vertical, 16)
                    .background(Capsule().fill(Theme.accent))
                    .foregroundColor(.white)
            }
            .buttonStyle(.tvTransparent)
            .padding(.top, 12)
        }
        .padding(40)
        .frame(width: 800, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.white.opacity(0.06))
        )
    }

    private var notSignedInCard: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text("Not signed in")
                .font(.ubuntu(32, .bold)).foregroundColor(.white)
            Text("Sign in with your phone to sync favorites across devices.")
                .font(.ubuntu(22)).foregroundColor(Theme.textSecondary)
            Button { router.go(.login) } label: {
                Text("Sign In")
                    .font(.ubuntu(24, .bold))
                    .padding(.horizontal, 44)
                    .padding(.vertical, 16)
                    .background(Capsule().fill(Theme.accent))
                    .foregroundColor(.white)
            }
            .buttonStyle(.tvTransparent)
            .padding(.top, 12)
        }
        .padding(40)
        .frame(width: 800, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 24).fill(Color.white.opacity(0.06))
        )
    }
}

// ────────────────────────────────────────────────────────────────────
// Login — QR / pairing-code page (web `pages/Login.tsx`).
// ────────────────────────────────────────────────────────────────────

struct LoginPage: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var router: TVRouter

    var body: some View {
        Stage1920x1080 {
            // ── Soft gradient background.
            LinearGradient(
                colors: [Theme.accent.opacity(0.18), Theme.background],
                startPoint: .topTrailing, endPoint: .bottomLeading
            )
            .frame(width: 1920, height: 1080)

            MegaRadioLogo(scale: 164.421 / 323.069).offset(x: 30, y: 64)
            AppSidebar(active: .settings)

            HStack(alignment: .top, spacing: 80) {
                // Left: instructions.
                VStack(alignment: .leading, spacing: 28) {
                    Text("Sign in with your phone")
                        .font(.ubuntu(48, .bold))
                        .foregroundColor(.white)

                    Group {
                        labeledStep("1", "Open the MegaRadio app on your phone or any browser.")
                        labeledStep("2", "Go to www.themegaradio.com/tv")
                        labeledStep("3", "Enter the code shown on the right.")
                    }

                    if let err = auth.lastError {
                        Text(err).font(.ubuntu(20)).foregroundColor(Theme.accent)
                    }

                    if auth.pendingCode == nil {
                        Button { Task { await auth.startPairing() } } label: {
                            Text("Show my code")
                                .font(.ubuntu(26, .bold))
                                .padding(.horizontal, 50)
                                .padding(.vertical, 18)
                                .background(Capsule().fill(Theme.accent))
                                .foregroundColor(.white)
                        }
                        .buttonStyle(.tvTransparent)
                        .padding(.top, 16)
                    }
                }
                .frame(width: 760, alignment: .leading)

                // Right: code card.
                if let code = auth.pendingCode {
                    VStack(spacing: 22) {
                        Text("Your code")
                            .font(.ubuntu(22)).foregroundColor(Theme.textSecondary)
                        Text(code)
                            .font(.system(size: 110, weight: .black, design: .monospaced))
                            .foregroundColor(.white)
                            .tracking(12)
                        Text("Waiting for activation…")
                            .font(.ubuntu(20)).foregroundColor(Theme.textTertiary)
                    }
                    .padding(50)
                    .frame(width: 540)
                    .background(
                        RoundedRectangle(cornerRadius: 28).fill(Theme.surface)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(Theme.accent.opacity(0.4), lineWidth: 2)
                    )
                    .shadow(color: Theme.accent.opacity(0.25), radius: 50)
                }
            }
            .frame(width: 1500, alignment: .topLeading)
            .offset(x: 192, y: 220)
        }
    }

    @ViewBuilder
    private func labeledStep(_ n: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 18) {
            Text(n)
                .font(.ubuntu(22, .bold))
                .foregroundColor(.white)
                .frame(width: 44, height: 44)
                .background(Circle().fill(Theme.accent))
            Text(text)
                .font(.ubuntu(22))
                .foregroundColor(.white)
                .lineSpacing(4)
        }
    }
}
