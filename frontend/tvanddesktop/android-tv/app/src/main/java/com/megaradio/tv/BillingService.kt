package com.megaradio.tv

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Google Play Billing v7 wrapper.
 *
 * Mirrors `/app/frontend/src/services/iapService.ts` (mobile RN app) so the
 * same backend endpoint validates both flows:
 *
 *   POST https://api.themegaradio.com/api/user/subscription
 *
 * The bridge layer (`MegaRadioBridge.invoke(...)`) calls these methods and
 * marshals the result back to JS.
 */
class BillingService(private val context: Context) : PurchasesUpdatedListener {

    companion object {
        private const val TAG = "BillingService"
        private val SUB_PRODUCT_IDS = listOf(
            "megaradio_premium_yearly",
            "megaradio_premium_monthly1",
            "megaradio_remove_ads_yearly1",
        )
        private val INAPP_PRODUCT_IDS = listOf(
            "megaradio_premium_lifetime",
        )
        private val ALL_IDS = SUB_PRODUCT_IDS + INAPP_PRODUCT_IDS

        private const val API_BASE = "https://api.themegaradio.com"
    }

    /** JWT from the Account-Linking flow. Set via `setAuthToken` JS call. */
    @Volatile var authToken: String? = null

    private val billingClient: BillingClient = BillingClient.newBuilder(context)
        .enablePendingPurchases()
        .setListener(this)
        .build()

    /** Pending purchase awaitable, completed by [onPurchasesUpdated]. */
    private var pendingPurchase: CompletableDeferred<JSONObject>? = null
    private var pendingProductId: String? = null

    suspend fun connect(): Boolean = suspendCancellableCoroutine { cont ->
        if (billingClient.isReady) { cont.resume(true); return@suspendCancellableCoroutine }
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                cont.resume(result.responseCode == BillingClient.BillingResponseCode.OK)
            }
            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "BillingClient disconnected; will reconnect on next request")
            }
        })
    }

    suspend fun getProducts(): JSONArray {
        if (!connect()) return JSONArray()
        val subParams = QueryProductDetailsParams.newBuilder()
            .setProductList(SUB_PRODUCT_IDS.map {
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(it)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build()
            }).build()
        val inappParams = QueryProductDetailsParams.newBuilder()
            .setProductList(INAPP_PRODUCT_IDS.map {
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(it)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            }).build()

        val subs = queryProductDetails(subParams)
        val inapps = queryProductDetails(inappParams)

        val arr = JSONArray()
        (subs + inapps).forEach { p ->
            val o = JSONObject()
            o.put("productId", p.productId)
            o.put("title", p.title.replace(" (MegaRadio)", ""))
            o.put("description", p.description)
            // Subs vs one-time price extraction
            val sub = p.subscriptionOfferDetails?.firstOrNull()?.pricingPhases?.pricingPhaseList?.firstOrNull()
            val oneTime = p.oneTimePurchaseOfferDetails
            if (sub != null) {
                o.put("localizedPrice", sub.formattedPrice)
                o.put("currency", sub.priceCurrencyCode)
                o.put("type", "subscription")
                o.put("billingPeriod", sub.billingPeriod)  // "P1M" | "P1Y"
            } else if (oneTime != null) {
                o.put("localizedPrice", oneTime.formattedPrice)
                o.put("currency", oneTime.priceCurrencyCode)
                o.put("type", "one-time")
                o.put("billingPeriod", "")
            }
            arr.put(o)
        }
        return arr
    }

    private suspend fun queryProductDetails(params: QueryProductDetailsParams): List<ProductDetails> =
        suspendCancellableCoroutine { cont ->
            billingClient.queryProductDetailsAsync(params) { _, list ->
                cont.resume(list ?: emptyList())
            }
        }

    suspend fun purchase(activity: Activity, productId: String): JSONObject {
        if (!connect()) return JSONObject().put("ok", false).put("error", "Billing service unavailable")

        val type = if (INAPP_PRODUCT_IDS.contains(productId))
            BillingClient.ProductType.INAPP else BillingClient.ProductType.SUBS

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(listOf(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(type)
                    .build()
            )).build()
        val details = queryProductDetails(params).firstOrNull()
            ?: return JSONObject().put("ok", false).put("error", "Product not found")

        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(details)
            .also { b ->
                if (type == BillingClient.ProductType.SUBS) {
                    val token = details.subscriptionOfferDetails?.firstOrNull()?.offerToken
                    if (token != null) b.setOfferToken(token)
                }
            }
            .build()
        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productParams))
            .build()

        val deferred = CompletableDeferred<JSONObject>()
        pendingPurchase = deferred
        pendingProductId = productId

        val launch = billingClient.launchBillingFlow(activity, flowParams)
        if (launch.responseCode != BillingClient.BillingResponseCode.OK) {
            pendingPurchase = null
            return JSONObject().put("ok", false).put("error", "Launch failed: ${launch.debugMessage}")
        }
        return deferred.await()
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val deferred = pendingPurchase ?: return
        val productId = pendingProductId ?: ""
        pendingPurchase = null
        pendingProductId = null

        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val purchase = purchases?.firstOrNull()
                if (purchase != null) {
                    // Acknowledge purchase
                    acknowledgeIfNeeded(purchase)
                    // Notify backend
                    val plan = postReceiptToBackend(productId, purchase)
                    deferred.complete(JSONObject().apply {
                        put("ok", true)
                        put("productId", productId)
                        put("plan", plan)
                    })
                } else {
                    deferred.complete(JSONObject().put("ok", false).put("error", "No purchase returned"))
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED ->
                deferred.complete(JSONObject().put("ok", false).put("error", "User cancelled"))
            else ->
                deferred.complete(JSONObject().put("ok", false)
                    .put("error", "Billing error ${result.responseCode}: ${result.debugMessage}"))
        }
    }

    private fun acknowledgeIfNeeded(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged) {
            val params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken).build()
            billingClient.acknowledgePurchase(params) { res ->
                Log.d(TAG, "ack: ${res.responseCode}")
            }
        }
    }

    suspend fun restore(): JSONObject {
        if (!connect()) return JSONObject().put("ok", false).put("error", "Billing service unavailable")
        val subsQuery = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS).build()
        val inappQuery = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP).build()

        val subs = queryPurchases(subsQuery)
        val inapps = queryPurchases(inappQuery)
        val purchase = (subs + inapps).firstOrNull {
            it.purchaseState == Purchase.PurchaseState.PURCHASED
        } ?: return JSONObject().put("ok", false).put("error", "No purchases found")

        val productId = purchase.products.firstOrNull() ?: ""
        val plan = postReceiptToBackend(productId, purchase)
        return JSONObject().apply {
            put("ok", true)
            put("productId", productId)
            put("plan", plan)
        }
    }

    private suspend fun queryPurchases(params: QueryPurchasesParams): List<Purchase> =
        suspendCancellableCoroutine { cont ->
            billingClient.queryPurchasesAsync(params) { _, list -> cont.resume(list) }
        }

    /**
     * POST receipt to backend. Mirrors mobile iapService.ts reportToBackend.
     * Runs synchronously inside the purchase callback (~100ms typical).
     */
    private fun postReceiptToBackend(productId: String, purchase: Purchase): String {
        val token = authToken
        if (token.isNullOrEmpty()) return planFromProductId(productId)
        return try {
            val url = URL("$API_BASE/api/user/subscription")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $token")
                connectTimeout = 8000
                readTimeout = 8000
            }
            val body = JSONObject().apply {
                put("platform", "android")
                put("productId", productId)
                put("transactionId", purchase.orderId ?: purchase.purchaseToken)
                put("originalTransactionId", purchase.orderId ?: purchase.purchaseToken)
                put("isTrial", false)
                put("purchaseToken", purchase.purchaseToken)
            }
            conn.outputStream.use { it.write(body.toString().toByteArray()) }
            val responseText = conn.inputStream.bufferedReader().use { it.readText() }
            val obj = JSONObject(responseText)
            obj.optString("plan").takeIf { it.isNotBlank() } ?: planFromProductId(productId)
        } catch (e: Exception) {
            Log.w(TAG, "Backend receipt POST failed (non-fatal): ${e.message}")
            planFromProductId(productId)
        }
    }

    private fun planFromProductId(pid: String): String = when (pid) {
        "megaradio_premium_yearly" -> "premium_yearly"
        "megaradio_premium_monthly1" -> "premium_monthly"
        "megaradio_premium_lifetime" -> "premium_lifetime"
        "megaradio_remove_ads_yearly1" -> "remove_ads"
        else -> "premium"
    }
}
