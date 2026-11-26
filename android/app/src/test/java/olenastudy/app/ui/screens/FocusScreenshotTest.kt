package olenastudy.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Modifier
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import java.time.Instant
import olenastudy.app.data.focus.FocusMode
import olenastudy.app.data.focus.FocusSnapshot
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.StopwatchState
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.PaperNavigationBar
import olenastudy.app.ui.navigation.AppDestination
import org.junit.Rule
import org.junit.Test

/** Imagens do Foco para comparar com o site (rodar: gradlew recordPaparazziDebug). */
class FocusScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false, screenHeight = 2340))

    private val now = Instant.parse("2026-11-25T15:00:00Z").toEpochMilli()

    private fun frame(dark: Boolean, snapshot: FocusSnapshot) {
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Column(Modifier.fillMaxSize().background(olenastudy.app.ui.OlenaTheme.colors.page).statusBarsPadding()) {
                    olenastudy.app.ui.PageHeader(Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                    Column(Modifier.weight(1f)) { FocusContent(snapshot, now, FocusActions(), animateEntrance = false) }
                    PaperNavigationBar(current = AppDestination.Focus, onSelect = {})
                }
            }
        }
    }

    private fun timer(minutes: Int = 0) =
        FocusSnapshot(
            Pomodoro.initial(), PomodoroConfig(), FocusMode.Timer, StopwatchState(),
            if (minutes > 0) listOf(olenastudy.app.domain.focus.FocusRecord(now - 3_600_000, minutes, "timer")) else emptyList(),
        )

    private fun pomodoro() = FocusSnapshot(Pomodoro.initial(), PomodoroConfig(), FocusMode.Pomodoro, StopwatchState(), emptyList())

    @Test fun cronometro_claro() = frame(false, timer())
    @Test fun cronometro_escuro() = frame(true, timer())
    @Test fun cronometro_florida_claro() = frame(false, timer(45))
    @Test fun pomodoro_claro() = frame(false, pomodoro())
    @Test fun pomodoro_escuro() = frame(true, pomodoro())
    @Test fun pomodoro_pausado() = frame(false, pomodoro().copy(pomodoro = Pomodoro.initial().copy(remainingMs = 1490_000)))
    @Test fun pomodoro_correndo() = frame(true, pomodoro().copy(pomodoro = Pomodoro.start(Pomodoro.initial(), now)))
    @Test fun pomodoro_com_horas() = frame(false, pomodoro().copy(pomodoro = Pomodoro.initial(PomodoroConfig(focusMinutes = 65))))
}
