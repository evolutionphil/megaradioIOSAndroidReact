// Splash.swift — 1:1 port of `web-preview/src/pages/Splash.tsx`.
//
// Renders the MegaRadio splash on a fixed 1920×1080 canvas. After ~1.5 s
// the user is routed to `/guide-1` (or `/discover-no-user` if onboarding
// has been completed previously).

import SwiftUI

struct SplashPage: View {
    @EnvironmentObject var router: TVRouter
    @State private var didStart = false

    private let onboardingKey = "megaradio.tv.onboardingCompleted"

    var body: some View {
        Stage1920x1080 {
            // ── Pink glow ellipse — left of logo, anim-pulse 4s.
            BrandImage(name: "ellipse2")
                .opacity(0.30)
                .frame(width: 781.011, height: 781.011)
                .offset(x: -377, y: 510.99)
                .blur(radius: 4)

            // ── Animated wave watermark (center, web class `inset-[34.91%_41.51%]`).
            // 34.91% of 1080 ≈ 377; 41.51% of 1920 ≈ 797. So waves sit at
            // (797, 377) and span the remainder ≈ 326 × 326.
            BrandImage(name: "waves")
                .opacity(0.40)
                .frame(width: 326, height: 326)
                .offset(x: 797, y: 377)

            // ── Frame445 dotted pattern, bottom-left.
            BrandImage(name: "frame445")
                .opacity(0.20)
                .frame(width: 667, height: 614)
                .offset(x: -16, y: 466)

            // ── Centered logo at (798, 484), size 323.069 × 112.
            MegaRadioLogo(scale: 1.0)
                .offset(x: 798, y: 484)

            // ── "Listen freely" tagline at (901, 624).
            Text("Listen freely")
                .font(.ubuntu(20, .medium))
                .foregroundColor(Theme.grayTagline)
                .position(x: 901 + 60, y: 624 + 14)

            // ── Device icon row (monitor / tablet / phone) at (916, 911), 88×46.
            HStack(spacing: 6) {
                BrandImage(name: "monitor").frame(width: 28, height: 28)
                BrandImage(name: "tablet").frame(width: 28, height: 36)
                BrandImage(name: "phone").frame(width: 16, height: 22)
            }
            .frame(width: 88, height: 46, alignment: .center)
            .offset(x: 916, y: 911)

            // ── "megaradio.live" at center bottom.
            Text("megaradio.live")
                .font(.ubuntu(22, .medium))
                .foregroundColor(.white)
                .frame(width: 200)
                .position(x: 960, y: 984)
        }
        .task {
            guard !didStart else { return }
            didStart = true
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            if UserDefaults.standard.bool(forKey: onboardingKey) {
                router.replace(.discover)
            } else {
                router.replace(.guide(1))
            }
        }
    }
}
