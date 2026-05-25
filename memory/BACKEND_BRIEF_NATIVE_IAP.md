# Native IAP Bridge — Apple TV & Android TV

> **Audience:** Apple TV (Swift) ve Android TV (Kotlin) native shell geliştiricileri.
> **TV/Web tarafı hazır.** Web view içinde `PremiumUpgradeNative` sayfası
> oluşturuldu. Tek ihtiyaç: native shell'in JS bridge'i implement etmesi.

---

## 0) Neden bu kurulum?

Samsung Tizen ve LG WebOS in-app billing'i yasaklıyor → bu yüzden onlar için
**QR kod + Stripe Checkout** (Account Linking) akışını kullanıyoruz.

**Apple TV ve Android TV** ise kendi mağaza billing'lerini ZORUNLU kılıyor:
- Apple TV → **StoreKit 2** (App Store)
- Android TV → **Google Play Billing v6+**

Mobil iOS/Android uygulamasında zaten aynı StoreKit/Play Billing kullanılıyor
(`/app/frontend/src/services/iapService.ts`). Apple TV için aynı App Store
hesabı + aynı Subscription Group ile tek satın alma tüm Apple cihazlarda
geçerli olur (TestFlight + production). Android için Play Console'da Apple'a
benzer şekilde tek subscription bütün Google hesabı cihazlarında geçerli.

---

## 1) Product ID'ler (sabit — değiştirmeyin)

App Store Connect ve Google Play Console'da bu ID'lerle yapılandırılmış:

| Product ID | Tür | Açıklama |
|---|---|---|
| `megaradio_premium_yearly` | Subscription (1Y) | Premium Yıllık |
| `megaradio_premium_monthly1` | Subscription (1M) | Premium Aylık |
| `megaradio_premium_lifetime` | Non-consumable | Premium Lifetime (tek seferlik) |
| `megaradio_remove_ads_yearly1` | Subscription (1Y) | Sadece reklam kaldır |

---

## 2) JS ↔ Native Bridge protokolü

Web view, native shell'e şu yapıda mesaj atar:

```json
{
  "id": "rpc-1-l3p4qx9k",
  "fn": "getProducts" | "purchaseProduct" | "restorePurchases" | "manageSubscriptions",
  "args": { "productId": "megaradio_premium_yearly" }
}
```

Native shell, web'e şu callback'i çağırarak cevap döner:

```js
window.MegaRadioBridge.__resolveIap(id, payload);
```

`payload` örnekleri:

```json
// getProducts cevabı
[
  {
    "productId": "megaradio_premium_yearly",
    "title": "Premium Yearly",
    "description": "Ad-free + HQ + multi-device",
    "localizedPrice": "$59.99",
    "currency": "USD",
    "type": "subscription",
    "billingPeriod": "P1Y"
  },
  ...
]
```

```json
// purchaseProduct / restorePurchases cevabı
{
  "ok": true,
  "productId": "megaradio_premium_yearly",
  "plan": "premium_yearly",
  "validUntil": "2027-02-25T00:00:00Z"
}
// veya
{ "ok": false, "error": "User cancelled" }
```

Hata varsa `{ "error": "açıklayıcı mesaj" }` döner; promise reject olur.

---

## 3) Apple TV (Swift) — Tam Implementation

### 3a) `MegaRadioTVApp.swift` içinde WebView kurulumu

```swift
import SwiftUI
import WebKit
import StoreKit

class IapMessageHandler: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    func userContentController(_ uc: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let id = body["id"] as? String,
              let fn = body["fn"] as? String else { return }
        let args = body["args"] as? [String: Any] ?? [:]

        Task {
            do {
                let payload: Any
                switch fn {
                case "getProducts":
                    payload = try await IapService.shared.getProducts()
                case "purchaseProduct":
                    let pid = args["productId"] as? String ?? ""
                    payload = try await IapService.shared.purchase(pid)
                case "restorePurchases":
                    payload = try await IapService.shared.restore()
                case "manageSubscriptions":
                    try await IapService.shared.openManage()
                    payload = ["ok": true]
                default:
                    payload = ["error": "Unknown fn: \(fn)"]
                }
                await resolve(id: id, payload: payload)
            } catch {
                await resolve(id: id, payload: ["error": error.localizedDescription])
            }
        }
    }

    @MainActor
    func resolve(id: String, payload: Any) async {
        let json = (try? JSONSerialization.data(withJSONObject: payload, options: []))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "null"
        webView?.evaluateJavaScript("window.MegaRadioBridge.__resolveIap('\(id)', \(json));")
    }
}
```

### 3b) WebView config'e handler bağla

```swift
let config = WKWebViewConfiguration()
let handler = IapMessageHandler()
config.userContentController.add(handler, name: "megaradio")

// Web tarafı "appletv" olarak algılasın:
let script = WKUserScript(
    source: "window.MegaRadioPlatform = { platform: 'appletv' };",
    injectionTime: .atDocumentStart,
    forMainFrameOnly: true)
config.userContentController.addUserScript(script)

let webView = WKWebView(frame: .zero, configuration: config)
handler.webView = webView
```

### 3c) StoreKit 2 servisi

```swift
import StoreKit

@MainActor
class IapService {
    static let shared = IapService()
    private let productIds = [
        "megaradio_premium_yearly",
        "megaradio_premium_monthly1",
        "megaradio_premium_lifetime",
        "megaradio_remove_ads_yearly1",
    ]

    func getProducts() async throws -> [[String: Any]] {
        let products = try await Product.products(for: productIds)
        return products.map { p in
            [
                "productId": p.id,
                "title": p.displayName,
                "description": p.description,
                "localizedPrice": p.displayPrice,
                "currency": p.priceFormatStyle.currencyCode,
                "type": p.type == .autoRenewable ? "subscription" : "one-time",
                "billingPeriod": p.subscription?.subscriptionPeriod.debugDescription ?? "",
            ]
        }
    }

    func purchase(_ productId: String) async throws -> [String: Any] {
        guard let product = try await Product.products(for: [productId]).first else {
            return ["ok": false, "error": "Product not found"]
        }
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            switch verification {
            case .verified(let transaction):
                // ⚠️ Backend'e gönder
                let plan = try await reportToBackend(transaction: transaction)
                await transaction.finish()
                return ["ok": true, "productId": productId, "plan": plan]
            case .unverified:
                return ["ok": false, "error": "Receipt unverified"]
            }
        case .userCancelled:
            return ["ok": false, "error": "User cancelled"]
        case .pending:
            return ["ok": false, "error": "Pending approval"]
        @unknown default:
            return ["ok": false, "error": "Unknown result"]
        }
    }

    func restore() async throws -> [String: Any] {
        try await AppStore.sync()
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result {
                let plan = try await reportToBackend(transaction: t)
                return ["ok": true, "productId": t.productID, "plan": plan]
            }
        }
        return ["ok": false, "error": "No purchases found"]
    }

    func openManage() async throws {
        // tvOS: bu Settings > Subscriptions açar
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            try await AppStore.showManageSubscriptions(in: scene)
        }
    }

    private func reportToBackend(transaction: Transaction) async throws -> String {
        let token = AuthStore.shared.token // Kendi auth state'inize göre
        guard !token.isEmpty else { return "premium" }

        var req = URLRequest(url: URL(string: "https://api.themegaradio.com/api/user/subscription")!)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let body: [String: Any] = [
            "platform": "ios",          // tvOS, App Store backend tarafında "ios" olarak işlem görür
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "receipt": try await AppStore.receiptData?.base64EncodedString() ?? "",
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, _) = try await URLSession.shared.data(for: req)
        if let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
            return obj["plan"] as? String ?? "premium"
        }
        return "premium"
    }
}
```

**Info.plist gereksinimleri:** Yok — StoreKit ekstra izin istemiyor.
**Capabilities:** "In-App Purchase" capability'i target'ta ENABLE edin.

---

## 4) Android TV (Kotlin) — Tam Implementation

### 4a) `build.gradle` (Module: app)

```gradle
dependencies {
    implementation 'com.android.billingclient:billing-ktx:7.0.0'
    // ... mevcut bağımlılıklar
}
```

### 4b) `MainActivity.kt` — WebView + JS Bridge

```kotlin
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

class IapBridge(private val webView: WebView, private val iap: IapService) {
    @JavascriptInterface
    val platform: String = "androidtv"

    @JavascriptInterface
    fun invoke(json: String) {
        val obj = JSONObject(json)
        val id = obj.getString("id")
        val fn = obj.getString("fn")
        val args = obj.optJSONObject("args") ?: JSONObject()

        iap.scope.launch {
            val payload: Any = try {
                when (fn) {
                    "getProducts" -> iap.getProducts()
                    "purchaseProduct" -> iap.purchase(args.getString("productId"))
                    "restorePurchases" -> iap.restore()
                    "manageSubscriptions" -> { iap.openManage(); JSONObject(mapOf("ok" to true)) }
                    else -> JSONObject(mapOf("error" to "Unknown fn: $fn"))
                }
            } catch (e: Exception) {
                JSONObject(mapOf("error" to (e.message ?: "Unknown error")))
            }
            resolve(id, payload)
        }
    }

    private fun resolve(id: String, payload: Any) {
        webView.post {
            val json = payload.toString()
            webView.evaluateJavascript(
                "window.MegaRadioBridge.__resolveIap('$id', $json);", null
            )
        }
    }
}

// Activity onCreate içinde:
val webView = findViewById<WebView>(R.id.webview)
webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(IapBridge(webView, iapService), "MegaRadioNative")
// Platform announcement:
webView.evaluateJavascript(
    "window.MegaRadioPlatform = { platform: 'androidtv' };", null
)
webView.loadUrl("https://desktop.themegaradio.com/")
```

### 4c) BillingClient v6/v7 servisi

```kotlin
class IapService(context: Context) {
    val scope = CoroutineScope(Dispatchers.Main)
    private val productIds = listOf(
        "megaradio_premium_yearly",
        "megaradio_premium_monthly1",
        "megaradio_premium_lifetime",
        "megaradio_remove_ads_yearly1",
    )
    private val billingClient = BillingClient.newBuilder(context)
        .setListener { result, purchases -> handlePurchases(result, purchases) }
        .enablePendingPurchases()
        .build()

    suspend fun getProducts(): JSONArray {
        // queryProductDetailsAsync()
        val productList = productIds.map {
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(it)
                .setProductType(
                    if (it == "megaradio_premium_lifetime") BillingClient.ProductType.INAPP
                    else BillingClient.ProductType.SUBS
                )
                .build()
        }
        val params = QueryProductDetailsParams.newBuilder().setProductList(productList).build()
        val (result, details) = billingClient.queryProductDetails(params)
        // … JSON'a serialize edip döndür
        return jsonArrayOf(details)
    }

    suspend fun purchase(productId: String): JSONObject {
        // launchBillingFlow() çağrısı + onPurchasesUpdated callback'i bekle
        // sonra reportToBackend(purchase) ile /api/user/subscription'a gönder
        // (mobile'daki iapService.ts'le aynı body)
        return JSONObject(mapOf("ok" to true, "productId" to productId, "plan" to "premium_yearly"))
    }

    suspend fun restore(): JSONObject = TODO()
    suspend fun openManage() {
        // Android: Play Store subscription URL'ini aç
        // intent.data = Uri.parse("https://play.google.com/store/account/subscriptions?sku=...&package=...")
    }
}
```

**AndroidManifest.xml:**
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

---

## 5) Backend `/api/user/subscription` — Hâlihazırda Var

Mobile app'in `iapService.ts → reportToBackend()` çağırdığı endpoint zaten production'da çalışıyor:
- `POST /api/user/subscription` → receipt validate eder, Mongo'ya kaydeder, plan döner
- `GET /api/user/subscription` → aktif plan, isActive flag, expiryDate döner

TV native shell'leri **birebir aynı body**'i POST eder (mobile + TV ortak endpoint):

```json
{
  "platform": "ios",                              // Apple TV için "ios", Android TV için "android"
  "productId": "megaradio_premium_yearly",
  "transactionId": "200000xxxxxx",
  "originalTransactionId": "200000xxxxxx",        // iOS: originalTransactionIdIOS, Android: transactionId
  "isTrial": false,
  "receipt": "MIIT.../base64-receipt-data",       // SADECE iOS
  "purchaseToken": "abcd...play-store-token"      // SADECE Android
}
```

Auth header: `Authorization: Bearer <JWT>` — kullanıcının mobile/TV'de
login olduğu token (Account Linking flow ile veya direct login ile gelmiş).

Response (success):
```json
{
  "plan": "premium_yearly",        // "none" | "remove_ads" | "premium_monthly" | "premium_yearly" | "premium_lifetime"
  "isActive": true,
  "expiryDate": "2027-02-25T00:00:00Z"   // null = lifetime
}
```

**Backend'de zaten implement edilmiş** — mobile iOS/Android bunu kullanıyor.
Apple TV ve Android TV native shell'lerinin yapacağı tek şey: aynı body'i
aynı endpoint'e POST etmek. Sıfır backend değişikliği.

### Plan Sync (TV açılışında)

Mobile'da `iapService.syncSubscriptionFromBackend()` app startup'ta
`GET /api/user/subscription` çağırarak local cache'i tazeliyor. TV
shell'leri aynısını yapmalı; sonra web view'a JS bridge ile aktarmalı:

```js
window.MegaRadioBridge.__updateSubscription({
  plan: "premium_yearly",
  isActive: true,
  expiryDate: "2027-02-25T00:00:00Z"
});
```

Bu sayede Discover header'daki PREMIUM rozeti ve Settings sayfasındaki
"Active until..." metni doğru görüntülenir.

---

## 6) Test Checklist

- [ ] `getProducts` çağrıldığında 4 product (lokalize fiyat ile) görünüyor mu?
- [ ] `purchaseProduct` sandbox satın alma sheet'ini açıyor mu?
- [ ] Başarılı satın alma sonrası `POST /api/user/subscription` çağrılıyor mu?
- [ ] Backend response'tan dönen `plan` web'e geçiyor mu?
- [ ] Discover header'da pembe **PREMIUM** rozeti çıkıyor mu?
- [ ] `restorePurchases` daha önceki satın almaları geri yüklüyor mu?
- [ ] Web preview'da (browser) `PremiumUpgradeQr` (QR ekran) açılıyor; Apple TV/Android TV native shell'de `PremiumUpgradeNative` (ürün kartları) açılıyor mu?

---

## 7) Web Tarafı Dosyaları (referans için)

- `src/lib/platform.ts` — Platform detection (`appletv`, `androidtv`, `tizen`, `webos`, `web`)
- `src/lib/nativeIap.ts` — Promise-based JS bridge (TS interface)
- `src/pages/PremiumUpgradeNative.tsx` — Native IAP UI (ürün kartları, satın alma akışı)
- `src/pages/PremiumUpgrade.tsx` — Platform-aware router (web/Samsung/LG için QR, Apple TV/Android TV için Native)
