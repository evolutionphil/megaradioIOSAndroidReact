# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# ============================================================
# MEGARADIO_PROGUARD_RULES
# ============================================================

# --- React Native Core ---
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# --- React Native TurboModules ---
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# --- React Native Reanimated ---
-keep class com.swmansion.reanimated.** { *; }

# --- Firebase ---
-keep class io.invertase.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn io.invertase.**

# --- Google AdMob / Play Services ---
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# --- React Native Track Player ---
-keep class com.doublesymmetry.trackplayer.** { *; }
-keep class com.doublesymmetry.kotlinaudio.** { *; }
-dontwarn com.doublesymmetry.**

# --- CarPlay / Android Auto ---
-keep class org.birkir.carplay.** { *; }
-dontwarn org.birkir.carplay.**

# --- Google Cast ---
-keep class com.google.android.gms.cast.** { *; }
-keep class com.reactnative.googlecast.** { *; }

# --- IAP (In-App Purchases) ---
-keep class com.dooboolab.rniap.** { *; }
-dontwarn com.dooboolab.rniap.**

# --- ExoPlayer (used by Track Player) ---
-keep class com.google.android.exoplayer2.** { *; }
-dontwarn com.google.android.exoplayer2.**

# --- Kotlin Coroutines ---
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }

# --- Expo Modules ---
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# --- Prevent stripping of native methods ---
-keepclassmembers class * { native <methods>; }

# --- Keep annotations ---
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes Exceptions

# @generated begin expo-build-properties - expo prebuild (DO NOT MODIFY)
-keep class io.invertase.** { *; }
-keep class com.google.android.gms.ads.** { *; }
# @generated end expo-build-properties