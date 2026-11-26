package olenastudy.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import olenastudy.app.data.focus.FocusMode
import olenastudy.app.data.focus.FocusSnapshot
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.StopwatchState
import olenastudy.app.ui.OlenaTheme
import org.junit.Rule
import org.junit.Test

class FocusWideScreenshotTest {
    @get:Rule val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(screenWidth = 1800, screenHeight = 2400, softButtons = false))

    private fun frame(dark: Boolean) {
        val config = PomodoroConfig(focusMinutes = 65)
        val snapshot = FocusSnapshot(Pomodoro.initial(config), config, FocusMode.Pomodoro, StopwatchState(), emptyList())
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Box(Modifier.fillMaxSize().background(OlenaTheme.colors.page)) {
                    FocusContent(snapshot, 0, FocusActions(), animateEntrance = false)
                }
            }
        }
    }

    @Test fun pomodoro_amplo_claro() = frame(false)
    @Test fun pomodoro_amplo_escuro() = frame(true)
}
