// build.gradle.kts (Module: wear)
// Wear OS app build configuration
// Uses the Kotlin Compose Compiler plugin configured in the root project.

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.visiongo.megaradio.wear"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.megaradio"
        minSdk = 30  // Wear OS 3.0+
        targetSdk = 35
        versionCode = 94
        versionName = "1.0.70"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

apply(from = rootProject.file("../../scripts/android-release-signing.gradle"))

dependencies {
    // Wear OS Compose
    implementation("androidx.wear.compose:compose-material:1.3.0")
    implementation("androidx.wear.compose:compose-foundation:1.3.0")
    implementation("androidx.wear.compose:compose-navigation:1.3.0")

    // Compose
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("androidx.compose.ui:ui-tooling-preview:1.6.0")
    implementation("androidx.compose.material:material-icons-extended:1.6.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Google Play Services for Wearable Data Layer
    implementation("com.google.android.gms:play-services-wearable:18.1.0")

    // Coroutines + Play Services await
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // Core
    implementation("androidx.core:core-ktx:1.12.0")

    // Debug
    debugImplementation("androidx.compose.ui:ui-tooling:1.6.0")
}
