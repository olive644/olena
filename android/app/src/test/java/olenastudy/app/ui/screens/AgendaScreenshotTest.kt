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
import java.time.LocalDate
import olenastudy.app.domain.agenda.Recurrence
import olenastudy.app.domain.agenda.StudyEvent
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.PageHeader
import olenastudy.app.ui.PaperNavigationBar
import olenastudy.app.ui.navigation.AppDestination
import org.junit.Rule
import org.junit.Test

/** Imagens da Agenda para comparar com o site (rodar: gradlew recordPaparazziDebug). */
class AgendaScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false, screenHeight = 3200))

    private val today = LocalDate.of(2026, 11, 25)
    private val events = listOf(
        StudyEvent("a", "Revisar Enem", date = "2026-11-25", time = "09:30", durationMinutes = 45),
        StudyEvent("b", "Aula de inglês", date = "2026-11-02", time = "14:00", recurrenceFrequency = Recurrence.weekly),
    )

    private fun frame(dark: Boolean, view: AgendaView) {
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Column(Modifier.fillMaxSize().background(OlenaTheme.colors.page).statusBarsPadding()) {
                    PageHeader(Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
                    Column(Modifier.weight(1f)) { AgendaPreview(events, today, view) }
                    PaperNavigationBar(current = AppDestination.Planner, onSelect = {})
                }
            }
        }
    }

    @Test fun mes_claro() = frame(false, AgendaView.Month)
    @Test fun mes_escuro() = frame(true, AgendaView.Month)
    @Test fun semana_claro() = frame(false, AgendaView.Week)
    @Test fun lista_claro() = frame(false, AgendaView.List)
}
