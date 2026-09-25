package com.visiongo.megaradio.wear.data

import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull

data class StationResponse(val requestId: String, val stations: List<Station>, val error: String?)

/** A delayed response for an earlier selection must never replace the current list. */
suspend fun awaitStationResponse(
    responses: StateFlow<StationResponse?>,
    requestId: String,
    timeoutMillis: Long = 20_000,
): StationResponse? = withTimeoutOrNull(timeoutMillis) {
    responses.filterNotNull().first { it.requestId == requestId }
}
