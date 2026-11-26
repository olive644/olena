package olenastudy.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.PageHeader
import olenastudy.app.ui.PaperNavigationBar
import olenastudy.app.ui.navigation.AppDestination
import org.junit.Rule
import org.junit.Test

/** Imagens do Espaço e do Perfil para comparar com o site (gradlew recordPaparazziDebug). */
class HomeProfileScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false, screenHeight = 3200))

    private fun frame(dark: Boolean, current: AppDestination, header: Boolean = true, content: @androidx.compose.runtime.Composable () -> Unit) {
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Column(Modifier.fillMaxSize().background(OlenaTheme.colors.page).statusBarsPadding()) {
                    if (header) PageHeader(Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                    Column(Modifier.weight(1f)) { content() }
                    PaperNavigationBar(current = current, onSelect = {})
                }
            }
        }
    }

    @Test fun espaco_claro() = frame(false, AppDestination.Today) { HomeScreen(HomeSummary(), {}) }
    @Test fun espaco_escuro() = frame(true, AppDestination.Today) { HomeScreen(HomeSummary(focusMinutesToday = 45, agendaToday = 2, flowerBloomed = true), {}) }
    @Test fun perfil_claro() = frame(false, AppDestination.Profile, header = false) { ProfileScreen(ThemeMode.System) {} }
    @Test fun perfil_moldura() = frame(false, AppDestination.Profile, header = false) { ProfileScreen(ThemeMode.System, look = olenastudy.app.domain.profile.ProfileLook(frameId = "pride", avatarId = "helena")) {} }
    @Test fun perfil_fundo_trans() = frame(false, AppDestination.Profile, header = false) { ProfileScreen(ThemeMode.System, look = olenastudy.app.domain.profile.ProfileLook(backgroundId = "trans", frameId = "pride")) {} }
    @Test fun perfil_fundo_ceu() = frame(true, AppDestination.Profile, header = false) { ProfileScreen(ThemeMode.Dark, look = olenastudy.app.domain.profile.ProfileLook(backgroundId = "night")) {} }
    @Test fun perfil_escuro() = frame(true, AppDestination.Profile, header = false) { ProfileScreen(ThemeMode.Dark) {} }
}
