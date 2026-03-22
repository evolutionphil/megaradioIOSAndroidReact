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

# @generated begin expo-build-properties - expo prebuild (DO NOT MODIFY)
-keep class io.invertase.** { *; }
-keep class com.google.android.gms.ads.** { *; }
# @generated end expo-build-properties

# Google Cast SDK
-keep class com.google.android.gms.cast.** { *; }
-keep class com.google.android.gms.cast.framework.** { *; }
-keep class com.reactnative.googlecast.** { *; }

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }

# Android Auto / Media
-keep class android.support.v4.media.** { *; }
-keep class androidx.media.** { *; }

# WorkManager
-keep class androidx.work.** { *; }

# OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }