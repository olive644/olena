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
import org.junit.Rule
import org.junit.Test

/** Configurações > Estudo e foco nos dois temas, para comparar com o site (gradlew recordPaparazziDebug). */
class SettingsStudyScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false, screenHeight = 6000))

    private fun shot(dark: Boolean) =
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Column(Modifier.fillMaxSize().background(OlenaTheme.colors.page).statusBarsPadding().padding(12.dp)) { StudySettingsContent() }
            }
        }

    @Test fun estudo_claro() = shot(false)

    @Test fun estudo_escuro() = shot(true)

    private fun cadernos(dark: Boolean) =
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Column(Modifier.fillMaxSize().background(OlenaTheme.colors.page).statusBarsPadding().padding(12.dp)) { NotebookSettingsContent() }
            }
        }

    @Test fun cadernos_claro() = cadernos(false)

    @Test fun cadernos_escuro() = cadernos(true)
}
