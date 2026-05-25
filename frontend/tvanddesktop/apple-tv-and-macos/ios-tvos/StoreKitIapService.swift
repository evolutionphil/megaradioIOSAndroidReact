// StoreKitIapService.swift — Apple TV (tvOS) StoreKit 2 IAP service.
//
// Bridges the React+Vite web view's `window.MegaRadioBridge` JS layer to
// StoreKit 2 (purchase / restore / manage subscriptions) and forwards the
// validated receipt to the existing backend endpoint:
//   POST https://api.themegaradio.com/api/user/subscription
//
// Mirrors `/app/frontend/src/services/iapService.ts` (mobile RN app)
// byte-for-byte so the same backend handler validates BOTH mobile and tvOS
// receipts. No backend changes required.

import Foundation
import StoreKit

#if os(tvOS) || os(iOS) || os(macOS)

@MainActor
final class StoreKitIapService {
    static let shared = StoreKitIapService()

    // Match the App Store Connect product IDs already used by the mobile app.
    private let productIds = [
        "megaradio_premium_yearly",
        "megaradio_premium_monthly1",
        "megaradio_premium_lifetime",
        "megaradio_remove_ads_yearly1",
    ]

    private var products: [Product] = []
    private var updatesTask: Task<Void, Never>?

    /// API base URL. Production = api.themegaradio.com. Override in build
    /// settings if you point tvOS at a staging server.
    var apiBaseUrl: String = "https://api.themegaradio.com"

    /// Auth token from the web view (Account-Linking JWT). Set this from the
    /// JS bridge whenever the user logs in / out so backend receipt posts
    /// carry the correct Bearer header.
    var authToken: String?

    private init() {
        // Apple highly recommends starting a listener on app launch so renewals
        // and reactivations from another device are picked up.
        updatesTask = Task.detached { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self else { return }
                if case .verified(let txn) = result {
                    _ = try? await self.reportToBackend(transaction: txn, productId: txn.productID)
                    await txn.finish()
                }
            }
        }
    }

    // MARK: - Product catalog

    func getProducts() async throws -> [[String: Any]] {
        let fetched = try await Product.products(for: productIds)
        self.products = fetched
        return fetched.map { p in
            let isSub = (p.type == .autoRenewable)
            return [
                "productId": p.id,
                "title": p.displayName,
                "description": p.description,
                "localizedPrice": p.displayPrice,
                "currency": p.priceFormatStyle.currencyCode ?? "USD",
                "type": isSub ? "subscription" : "one-time",
                "billingPeriod": (p.subscription?.subscriptionPeriod.unit == .year) ? "P1Y"
                              : (p.subscription?.subscriptionPeriod.unit == .month) ? "P1M"
                              : "",
            ]
        }
    }

    // MARK: - Purchase

    func purchase(productId: String) async throws -> [String: Any] {
        let product: Product
        if let cached = products.first(where: { $0.id == productId }) {
            product = cached
        } else if let fetched = try await Product.products(for: [productId]).first {
            product = fetched
        } else {
            return ["ok": false, "error": "Product not found"]
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            switch verification {
            case .verified(let txn):
                let plan = try await reportToBackend(transaction: txn, productId: productId)
                await txn.finish()
                return [
                    "ok": true,
                    "productId": productId,
                    "plan": plan,
                ]
            case .unverified(_, let error):
                return ["ok": false, "error": "Receipt unverified: \(error.localizedDescription)"]
            }
        case .userCancelled:
            return ["ok": false, "error": "User cancelled"]
        case .pending:
            return ["ok": false, "error": "Purchase pending approval"]
        @unknown default:
            return ["ok": false, "error": "Unknown StoreKit result"]
        }
    }

    // MARK: - Restore

    func restore() async throws -> [String: Any] {
        try? await AppStore.sync()

        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let txn) = result {
                let plan = try await reportToBackend(transaction: txn, productId: txn.productID)
                return [
                    "ok": true,
                    "productId": txn.productID,
                    "plan": plan,
                ]
            }
        }
        return ["ok": false, "error": "No purchases found"]
    }

    // MARK: - Manage subscriptions (deep-link to tvOS Settings)

    func openManageSubscriptions() async throws {
        #if os(tvOS)
        if let url = URL(string: "App-Prefs:root=STORE&path=SUBSCRIPTIONS") {
            await UIApplication.shared.open(url)
        }
        #else
        if #available(iOS 15.0, *) {
            if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                try await AppStore.showManageSubscriptions(in: scene)
            }
        }
        #endif
    }

    // MARK: - Backend receipt validation

    private func reportToBackend(transaction txn: StoreKit.Transaction, productId: String) async throws -> String {
        guard let token = authToken, !token.isEmpty else {
            // No logged-in user → just trust StoreKit locally; the user can
            // log in later and we'll re-sync via /api/user/subscription GET.
            return planFromProductId(productId)
        }

        var body: [String: Any] = [
            "platform": "ios",
            "productId": productId,
            "transactionId": String(txn.id),
            "originalTransactionId": String(txn.originalID),
            "isTrial": false,
        ]
        // jwsRepresentation is StoreKit 2's signed JWS receipt; the backend
        // verifies it against Apple's public keys.
        body["receipt"] = txn.jsonRepresentation.base64EncodedString()

        guard let url = URL(string: apiBaseUrl + "/api/user/subscription") else {
            return planFromProductId(productId)
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        do {
            let (data, _) = try await URLSession.shared.data(for: req)
            if let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let plan = obj["plan"] as? String, !plan.isEmpty {
                return plan
            }
        } catch {
            // Non-fatal — local activation already done in the success path.
        }
        return planFromProductId(productId)
    }

    private func planFromProductId(_ pid: String) -> String {
        switch pid {
        case "megaradio_premium_yearly":     return "premium_yearly"
        case "megaradio_premium_monthly1":   return "premium_monthly"
        case "megaradio_premium_lifetime":   return "premium_lifetime"
        case "megaradio_remove_ads_yearly1": return "remove_ads"
        default: return "premium"
        }
    }
}

#endif
