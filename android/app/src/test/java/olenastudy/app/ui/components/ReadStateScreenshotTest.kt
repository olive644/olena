package olenastudy.app.ui.components

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import olenastudy.app.data.ReadState
import olenastudy.app.ui.OlenaTheme
import org.junit.Rule
import org.junit.Test

class ReadStateScreenshotTest {
    @get:Rule val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false))

    private fun frame(dark: Boolean, state: ReadState<Unit>) {
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                ReadStateContent(state, {}, "Carregando sua agenda…") {}
            }
        }
    }

    @Test fun loading_light() = frame(false, ReadState.Loading)
    @Test fun loading_dark() = frame(true, ReadState.Loading)
    @Test fun error_light() = frame(false, ReadState.Failed)
    @Test fun error_dark() = frame(true, ReadState.Failed)
}
