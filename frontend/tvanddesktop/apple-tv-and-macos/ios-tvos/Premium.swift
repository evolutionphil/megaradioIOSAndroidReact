import SwiftUI
import StoreKit

private struct PremiumProduct: Identifiable {
    let id: String
    let name: String
    let price: String
}
struct PremiumPage: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var router: TVRouter
    @State private var products: [PremiumProduct] = []
    @State private var loading = true
    @State private var busy = false
    @State private var notice = ""
    @State private var failure = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Text("MegaRadio Premium").font(.ubuntu(48, .bold))
            Text("Listen without interruptions. Purchases stay linked to your signed-in account.")
                .font(.ubuntu(24)).foregroundColor(Theme.textSecondary)
            if loading { ProgressView().accessibilityIdentifier("tv-premium-loading") }
            if !failure.isEmpty { Text(failure).foregroundColor(Theme.red).accessibilityIdentifier("tv-premium-error") }
            if !notice.isEmpty { Text(notice).foregroundColor(Theme.accent).accessibilityIdentifier("tv-premium-result") }
            if !auth.isAuthenticated {
                Button("Sign in to purchase or restore") { router.go(.login) }
                    .accessibilityIdentifier("tv-premium-login")
            } else {
                ForEach(products) { product in
                    Button { perform(product.id) } label: {
                        HStack { Text(product.name); Spacer(); Text(product.price) }.frame(width: 900)
                    }.disabled(busy).accessibilityIdentifier("tv-premium-buy-\(product.id)")
                }
                Button("Restore Purchases") { perform(nil) }.disabled(busy)
                    .accessibilityIdentifier("tv-premium-restore")
            }
            if !loading && products.isEmpty {
                Button("Retry loading prices") { Task { await loadProducts() } }.disabled(busy)
            }
            if busy { ProgressView("Waiting for store verification…") }
            Button("Back") { router.back() }.disabled(busy).accessibilityIdentifier("tv-premium-back")
        }
        .font(.ubuntu(24)).foregroundColor(Theme.textPrimary).padding(80)
        .frame(width: 1920, height: 1080, alignment: .topLeading)
        .background(Theme.background).task { await loadProducts() }
    }
    @MainActor private func loadProducts() async {
        loading = true; failure = ""
        defer { loading = false }
        do {
            products = try await StoreKitIapService.shared.getProducts().compactMap { value in
                guard let id = value["productId"] as? String,
                      let price = value["localizedPrice"] as? String else { return nil }
                return PremiumProduct(id: id, name: value["title"] as? String ?? id, price: price)
            }
            if products.isEmpty { failure = "Store products are unavailable. Please try again." }
        } catch { failure = error.localizedDescription }
    }
    private func perform(_ productId: String?) {
        guard !busy else { return }
        busy = true; failure = ""; notice = ""
        Task { @MainActor in
            defer { busy = false }
            do {
                try await auth.refreshSession() // Validate JWT before a purchase sheet.
                let result: [String: Any]
                if let id = productId { result = try await StoreKitIapService.shared.purchase(productId: id) }
                else { result = try await StoreKitIapService.shared.restore() }
                if result["ok"] as? Bool == true {
                    notice = "Your purchase was verified by MegaRadio."
                    try await auth.refreshSession()
                } else { failure = result["error"] as? String ?? "The purchase was not completed." }
            } catch { failure = error.localizedDescription }
        }
    }
}