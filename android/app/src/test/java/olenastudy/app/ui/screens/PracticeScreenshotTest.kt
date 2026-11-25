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
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.PageHeader
import olenastudy.app.ui.PaperNavigationBar
import olenastudy.app.ui.navigation.AppDestination
import org.junit.Rule
import org.junit.Test

class PracticeScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false, screenHeight = 2340))

    private fun frame(dark: Boolean) = paparazzi.snapshot {
        OlenaTheme(darkTheme = dark) {
            Column(Modifier.fillMaxSize().background(OlenaTheme.colors.page).statusBarsPadding()) {
                PageHeader(Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                Column(Modifier.weight(1f)) { PracticeScreen() }
                PaperNavigationBar(current = AppDestination.Learn, onSelect = {})
            }
        }
    }

    @Test fun praticar_claro() = frame(false)

    @Test fun praticar_escuro() = frame(true)
}
