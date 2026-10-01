package com.visiongo.megaradio.wear.data

import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class StationRequestTest {
    @Test fun ignoresOldSelectionsAndWaitsBeyondThreeSeconds() = runTest {
        val responses = MutableStateFlow<StationResponse?>(StationResponse("old", emptyList(), null))
        val result = async { awaitStationResponse(responses, "current") }
        testScheduler.runCurrent()
        testScheduler.advanceTimeBy(5_000)
        responses.value = StationResponse("other", listOf(Station("wrong", "Wrong")), null)
        testScheduler.runCurrent()
        assertFalse(result.isCompleted)
        responses.value = StationResponse("current", listOf(Station("right", "Right")), null)
        assertEquals("right", result.await()!!.stations.single().id)
    }

    @Test fun acceptsEmptyResponseInsteadOfShowingCachedStations() = runTest {
        val responses = MutableStateFlow<StationResponse?>(StationResponse("current", emptyList(), null))
        assertTrue(awaitStationResponse(responses, "current")!!.stations.isEmpty())
    }

    @Test fun missingPhoneResponseTimesOut() = runTest {
        assertNull(awaitStationResponse(MutableStateFlow(null), "missing", 20_000))
    }

    @Test fun cancellingSelectionStopsWaiting() = runTest {
        val waiting = async { awaitStationResponse(MutableStateFlow(null), "cancelled") }
        testScheduler.runCurrent()
        waiting.cancel()
        assertTrue(waiting.isCancelled)
    }
}
