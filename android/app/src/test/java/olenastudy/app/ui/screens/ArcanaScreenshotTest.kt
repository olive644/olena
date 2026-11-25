package olenastudy.app.ui.screens

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.android.resources.Density
import olenastudy.app.ui.OlenaTheme
import org.junit.Rule
import org.junit.Test

/** Imagens da galeria de Arcano em 390x844 dp (como o celular do site) para comparar com a captura do site. */
class ArcanaScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_5.copy(screenWidth = 1170, screenHeight = 2532, xdpi = 480, ydpi = 480, density = Density.XXHIGH, softButtons = false),
    )

    private fun shot(dark: Boolean, scrollDp: Int) {
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                // Fundo do Perfil esmaecido, como o escurecimento do diálogo.
                Box(Modifier.fillMaxSize().background(if (dark) androidx.compose.ui.graphics.Color(0xFF0E0C12) else androidx.compose.ui.graphics.Color(0xFF8F8B84))) {
                    ArcanaContent(onDismiss = {}, scroll = ScrollState(initial = scrollDp * 3))
                }
            }
        }
    }

    @Test fun arcano_claro() = shot(false, 0)
    @Test fun arcano_escuro() = shot(true, 0)
    @Test fun arcano_claro_rolado() = shot(false, 684)
    @Test fun arcano_escuro_rolado() = shot(true, 684)
}
