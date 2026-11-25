package olenastudy.app.ui.screens

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import olenastudy.app.ui.OlenaTheme
import org.junit.Rule
import org.junit.Test

/** Galeria de Conquistas nos dois temas, para comparar com o site (gradlew recordPaparazziDebug). */
class AchievementsScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false, screenHeight = 3600))

    @Test fun conquistas_claro() = paparazzi.snapshot { OlenaTheme(darkTheme = false) { AchievementsContent({}) } }

    @Test fun conquistas_escuro() = paparazzi.snapshot { OlenaTheme(darkTheme = true) { AchievementsContent({}) } }
}
