plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "olenastudy.app"
    compileSdk {
        version = release(37) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        // Mesmo id do app publicado como PWA, para a versão nativa entrar como atualização.
        applicationId = "olenastudy.app"
        minSdk = 26
        targetSdk = 36
        // O versionCode precisa ser maior que o maior já enviado à Play Store (confira no Play Console).
        versionCode = 10
        versionName = "2.0.0-dev"
    }

    buildTypes {
        debug {
            // Instala ao lado do app publicado (mesmo id base), sem substituí-lo nem exigir a mesma assinatura.
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
