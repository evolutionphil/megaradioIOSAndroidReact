package com.megaradio.wearbridge

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

// Google Data Layer already enforces matching application ID/signing identities.
// Never queue old PLAY commands indefinitely when the phone runtime isn't ready.
internal object WearCommandBus {
    private val commands = setOf("play", "pause", "resume", "next", "previous", "toggle_favorite", "request_data")
    private val pending = ArrayDeque<Pair<Long, Map<String, String>>>()
    var listener: ((Map<String, String>) -> Boolean)? = null
    @Synchronized fun receive(path: String, bytes: ByteArray) {
        if (!path.startsWith("/megaradio/command/") || bytes.size > 16384) return
        val command = path.removePrefix("/megaradio/command/")
        if (command !in commands) return
        val message = mapOf("command" to command, "data" to bytes.toString(Charsets.UTF_8))
        if (listener?.invoke(message) == true) return
        if (pending.size >= 20) pending.removeFirst()
        pending.addLast(System.currentTimeMillis() to message)
    }
    @Synchronized fun flush() {
        while (pending.isNotEmpty()) {
            val next = pending.first()
            if (System.currentTimeMillis() - next.first > 15000) { pending.removeFirst(); continue }
            if (listener?.invoke(next.second) != true) break
            pending.removeFirst()
        }
    }
}
class PhoneWearListenerService : WearableListenerService() {
    override fun onMessageReceived(event: MessageEvent) { WearCommandBus.receive(event.path, event.data) }
}