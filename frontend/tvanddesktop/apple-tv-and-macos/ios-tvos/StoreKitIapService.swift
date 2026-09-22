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
#if canImport(UIKit)
import UIKit
#endif

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
    var authToken: String? { AuthStore.shared.token }

    private init() {
        // Apple highly recommends starting a listener on app launch so renewals
        // and reactivations from another device are picked up.
        updatesTask = Task.detached { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self else { return }
                if case .verified(let txn) = result {
                    do {
                        _ = try await self.reportToBackend(transaction: txn, productId: txn.productID,
                                                           receipt: result.jwsRepresentation)
                        await txn.finish()
                    } catch {
                        // Keep unfinished so restore/StoreKit can retry synchronization.
                        print("[StoreKit] Subscription sync failed; transaction remains unfinished")
                    }
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
        guard let token = authToken, !token.isEmpty else {
            throw NSError(domain: "MegaRadio.StoreKit", code: 401,
                          userInfo: [NSLocalizedDescriptionKey: "Sign in before purchasing"])
        }
        let product: Product
        if let cached = products.first(where: { $0.id == productId }) {
            product = cached
        } else if let fetched = try await Product.products(for: [productId]).first {
            product = fetched
        } else {
            return ["ok": false, "error": "Product not found"]
        }

        let result = try await product.purchase()
        guard authToken == token else { throw APIError.requestFailed(401) }
        switch result {
        case .success(let verification):
            switch verification {
            case .verified(let txn):
                let plan = try await reportToBackend(transaction: txn, productId: productId,
                                                     receipt: verification.jwsRepresentation)
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
        guard let owner = authToken, !owner.isEmpty else { throw APIError.requestFailed(401) }
        try await AppStore.sync()
        guard authToken == owner else { throw APIError.requestFailed(401) }

        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let txn) = result {
                guard authToken == owner else { throw APIError.requestFailed(401) }
                guard txn.revocationDate == nil,
                      txn.expirationDate.map({ $0 > Date() }) ?? true else { continue }
                let plan = try await reportToBackend(transaction: txn, productId: txn.productID,
                                                     receipt: result.jwsRepresentation)
                await txn.finish()
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
        #elseif os(iOS)
        if #available(iOS 15.0, *) {
            if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                try await AppStore.showManageSubscriptions(in: scene)
            }
        }
        #elseif os(macOS)
        throw NSError(domain: "MegaRadio.StoreKit", code: 501,
                      userInfo: [NSLocalizedDescriptionKey: "Manage subscriptions in App Store account settings"])
        #endif
    }

    // MARK: - Backend receipt validation

    private func reportToBackend(transaction txn: StoreKit.Transaction, productId: String, receipt: String) async throws -> String {
        guard let token = authToken, !token.isEmpty else {
            throw NSError(domain: "MegaRadio.StoreKit", code: 401,
                          userInfo: [NSLocalizedDescriptionKey: "Sign in to verify your purchase"])
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
        body["receipt"] = receipt

        guard let url = URL(string: apiBaseUrl + "/api/user/subscription") else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.timeoutInterval = 15
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.requestFailed((response as? HTTPURLResponse)?.statusCode ?? -1)
        }
        guard authToken == token,
              let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              (obj["success"] as? Bool) != false,
              obj["error"] == nil || obj["error"] is NSNull || (obj["error"] as? String) == "",
              let plan = obj["plan"] as? String,
              !plan.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw APIError.decodingFailed("No verified subscription returned")
        }
        return plan
    }
}

#endif
