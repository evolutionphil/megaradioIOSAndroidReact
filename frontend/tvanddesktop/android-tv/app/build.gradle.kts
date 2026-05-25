plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.megaradio.tv"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.megaradio.tv"
        minSdk = 23          // Android TV baseline (API 23 covers Fire TV Stick 4K)
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { viewBinding = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.leanback:leanback:1.0.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.media:media:1.7.0")
    // Google Play Billing v7 — in-app purchases / subscriptions for the
    // Premium plan (mirror of the mobile app's react-native-iap setup).
    implementation("com.android.billingclient:billing-ktx:7.0.0")
    // Coroutines used by BillingService for suspend-style purchase flows.
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
