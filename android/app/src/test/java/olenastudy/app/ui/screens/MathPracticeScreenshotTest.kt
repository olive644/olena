package olenastudy.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.android.resources.Density
import kotlinx.serialization.json.Json
import olenastudy.app.domain.practice.*
import olenastudy.app.ui.OlenaTheme
import org.junit.Rule
import org.junit.Test

class MathPracticeScreenshotTest {
    @get:Rule val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false))
    private fun resource(name: String) = requireNotNull(javaClass.classLoader?.getResourceAsStream("practice/$name.json")).bufferedReader().use { it.readText() }
    private val catalog = Json.decodeFromString<PracticeCatalog>(resource("catalog"))
    private val bank = MathQuestionBank(Json.decodeFromString<MathBankFile>(resource("math-bank")))

    private fun frame(dark: Boolean, content: @Composable () -> Unit) = paparazzi.snapshot {
        OlenaTheme(darkTheme = dark) { Box(Modifier.fillMaxSize().background(OlenaTheme.colors.page)) { content() } }
    }
    private fun map(dark: Boolean, index: Int = 0) = frame(dark) { MathCourseMap(catalog.courses, index, "helena", {}, {}, {}, {}) }
    private fun round(dark: Boolean, stage: String) {
        var state = MathArcadeRound().start(1_000, 1_000).tick(4_000, 4_000, bank)
        if (stage in setOf("feedback", "review")) {
            val q = state.question(bank)
            state = state.answer(q.choices.first { it != q.entry.answer }, 4_500, 4_500, bank)
        }
        state = when (stage) {
            "review" -> state.copy(stage = "review", lives = 0)
            "paused" -> state.copy(paused = true)
            "results" -> state.copy(stage = "results", lives = 0)
            else -> state
        }
        frame(dark) { MathRoundContent(state, bank, {}, {}, {}, {}, {}, {}, {}) }
    }
    @Test fun mapa_claro() = map(false)
    @Test fun mapa_escuro() = map(true)
    @Test fun conta_pendente_claro() = map(false, 1)
    @Test fun conta_pendente_escuro() = map(true, 1)
    @Test fun pergunta_claro() = round(false, "playing")
    @Test fun pergunta_escuro() = round(true, "playing")
    @Test fun resposta_claro() = round(false, "feedback")
    @Test fun resposta_escuro() = round(true, "feedback")
    @Test fun revisao_claro() = round(false, "review")
    @Test fun revisao_escuro() = round(true, "review")
    @Test fun pausa_claro() = round(false, "paused")
    @Test fun pausa_escuro() = round(true, "paused")
    @Test fun resultado_claro() = round(false, "results")
    @Test fun resultado_escuro() = round(true, "results")
    @Test fun pergunta_ampla_claro() {
        paparazzi.unsafeUpdateConfig(deviceConfig = DeviceConfig.PIXEL_5.copy(screenWidth = 1600, screenHeight = 1000, density = Density.MEDIUM, softButtons = false))
        round(false, "playing")
    }
    @Test fun pergunta_ampla_escuro() {
        paparazzi.unsafeUpdateConfig(deviceConfig = DeviceConfig.PIXEL_5.copy(screenWidth = 1600, screenHeight = 1000, density = Density.MEDIUM, softButtons = false))
        round(true, "playing")
    }
}
