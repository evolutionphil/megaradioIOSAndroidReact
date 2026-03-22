# Wear OS ProGuard rules

# Keep Wearable API classes
-keep class com.google.android.gms.wearable.** { *; }

# Keep data models
-keep class com.visiongo.megaradio.wear.data.** { *; }

# Keep WearableListenerService
-keep class com.visiongo.megaradio.wear.MegaRadioWearListenerService { *; }

# Keep Compose
-dontwarn androidx.compose.**
-keep class androidx.compose.** { *; }

# Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }
