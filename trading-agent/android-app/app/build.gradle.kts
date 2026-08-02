plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Optional echter Release-Signing-Key: nur aktiv, wenn alle vier Properties gesetzt sind
// (lokal via gradle.properties, in CI via -P.../GitHub Secrets). Sonst debug-signiert.
val releaseStoreFile = findProperty("RELEASE_STORE_FILE") as String?
val releaseStorePassword = findProperty("RELEASE_STORE_PASSWORD") as String?
val releaseKeyAlias = findProperty("RELEASE_KEY_ALIAS") as String?
val releaseKeyPassword = findProperty("RELEASE_KEY_PASSWORD") as String?
val hasReleaseSigning = !releaseStoreFile.isNullOrBlank() &&
    !releaseStorePassword.isNullOrBlank() &&
    !releaseKeyAlias.isNullOrBlank() &&
    !releaseKeyPassword.isNullOrBlank()

android {
    namespace = "com.freshtrades.android"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.freshtrades.android"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    flavorDimensions += "environment"
    productFlavors {
        create("live") {
            dimension = "environment"
            buildConfigField("boolean", "IS_DEMO", "false")
        }
        create("demo") {
            dimension = "environment"
            applicationIdSuffix = ".demo"
            versionNameSuffix = "-demo"
            buildConfigField("boolean", "IS_DEMO", "true")
        }
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Nutzt den echten Release-Key, sobald einer hinterlegt ist – sonst
            // debug-signiert für einfaches Sideloading (siehe README).
            signingConfig = if (hasReleaseSigning) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.documentfile:documentfile:1.0.1")
    implementation("com.google.android.material:material:1.12.0")
}
