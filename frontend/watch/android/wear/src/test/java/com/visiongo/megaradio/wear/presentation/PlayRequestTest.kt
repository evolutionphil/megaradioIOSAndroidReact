package com.visiongo.megaradio.wear.presentation

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class PlayRequestTest {
    @Test fun missingPhonePreventsNavigationAndReportsHowToReconnect() = runTest {
        var error: String? = null
        var navigated = false

        if (dispatchPlayRequest(sendCommand = { false }, setError = { error = it })) {
            navigated = true
        }

        assertFalse(navigated)
        assertEquals("Open MegaRadio on your connected Android phone, then try again.", error)
    }

    @Test fun waitsForDispatchBeforeAllowingNavigationAndClearsOldError() = runTest {
        val delivery = CompletableDeferred<Boolean>()
        var error: String? = "A previous request failed"
        var navigated = false
        val request = async {
            if (dispatchPlayRequest(sendCommand = { delivery.await() }, setError = { error = it })) {
                navigated = true
            }
        }

        testScheduler.runCurrent()
        assertNull(error)
        assertFalse(navigated)
        delivery.complete(true)
        request.await()
        assertTrue(navigated)
        assertNull(error)
    }

    @Test fun leavingTheScreenCancelsPendingDispatchWithoutNavigating() = runTest {
        val delivery = CompletableDeferred<Boolean>()
        var navigated = false
        val request = async {
            if (dispatchPlayRequest(sendCommand = { delivery.await() }, setError = {})) {
                navigated = true
            }
        }

        testScheduler.runCurrent()
        request.cancel()
        delivery.complete(true)
        request.join()

        assertTrue(request.isCancelled)
        assertFalse(navigated)
    }
}
