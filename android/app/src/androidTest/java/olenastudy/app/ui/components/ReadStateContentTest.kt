package olenastudy.app.ui.components

import androidx.activity.compose.setContent
import android.view.KeyEvent
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.compose.ui.graphics.asAndroidBitmap
import java.io.File
import java.io.IOException
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import olenastudy.app.MainActivity
import olenastudy.app.data.ReadState
import olenastudy.app.ui.OlenaTheme
import org.junit.Rule
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ReadStateContentTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private fun mount(content: @Composable () -> Unit) {
        compose.activityRule.scenario.onActivity { activity ->
            activity.setContent { OlenaTheme { content() } }
        }
    }

    private fun capture(name: String) {
        val prefix = InstrumentationRegistry.getArguments().getString("evidenceName") ?: return
        compose.waitForIdle()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val directory = File(instrumentation.targetContext.getExternalFilesDir(null), "read-state-evidence").apply { mkdirs() }
        // Aguarda o desenho do Compose para não registrar um quadro da tela anterior.
        val bitmap = compose.onRoot().captureToImage().asAndroidBitmap()
        File(directory, "$prefix-$name.png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
    }

    @Test fun aPendingReadDoesNotShowAnEmptyAgenda() {
        val state = MutableStateFlow<ReadState<List<String>>>(ReadState.Loading)
        mount {
            val current by state.collectAsState()
            ReadStateContent(current, {}, "Carregando agenda") { Text(if (it.isEmpty()) "Agenda vazia" else it.first()) }
        }
        compose.onNodeWithText("Carregando agenda").assertIsDisplayed()
        capture("loading")
        compose.onNodeWithText("Agenda vazia").assertDoesNotExist()
        compose.runOnIdle { state.value = ReadState.Ready(emptyList()) }
        compose.onNodeWithText("Agenda vazia").assertIsDisplayed()
        compose.onNodeWithText("Carregando agenda").assertDoesNotExist()
    }

    @Test fun retryReadsAgainAndOnlyThenShowsTheSavedContent() {
        val attempts = AtomicInteger()
        val saved = MutableStateFlow(listOf("Revisão salva"))
        val source = flow {
            if (attempts.incrementAndGet() == 1) throw IOException("private file path")
            emitAll(saved)
        }
        mount {
            val read = rememberReadState(source)
            ReadStateContent(read.state, read.retry, "Carregando agenda") { Text(it.first()) }
        }
        compose.waitUntil(10_000) { attempts.get() == 1 }
        compose.onNodeWithText("Não foi possível ler seus dados").assertIsDisplayed()
        capture("error")
        compose.onNodeWithText("private file path").assertDoesNotExist()
        compose.onNodeWithText("Revisão salva").assertDoesNotExist()
        compose.onNodeWithText("Tentar novamente").performClick()
        compose.waitUntil(10_000) { attempts.get() == 2 }
        compose.onNodeWithText("Revisão salva").assertIsDisplayed()
    }

    @Test fun theOpenScreenSurvivesFailureAndRetry() {
        val state = MutableStateFlow<ReadState<Unit>>(ReadState.Ready(Unit))
        mount {
            val current by state.collectAsState()
            ReadStateContent(current, { state.value = ReadState.Ready(Unit) }, "Carregando agenda") {
                var page by rememberSaveable { mutableIntStateOf(1) }
                PaperButton("Página $page", onClick = { page++ })
            }
        }
        compose.onNodeWithText("Página 1").performClick()
        compose.onNodeWithText("Página 2").assertIsDisplayed()
        compose.runOnIdle { state.value = ReadState.Failed }
        compose.onNodeWithText("Tentar novamente").assertIsDisplayed()
        compose.runOnIdle { state.value = ReadState.Loading }
        compose.onNodeWithText("Carregando agenda").assertIsDisplayed()
        compose.runOnIdle { state.value = ReadState.Ready(Unit) }
        compose.onNodeWithText("Página 2").assertIsDisplayed()
    }

    private fun retryWithKeyboard(highlight: Boolean) {
        val state = MutableStateFlow<ReadState<String>>(ReadState.Failed)
        compose.activityRule.scenario.onActivity { activity ->
            activity.setContent {
                OlenaTheme(highlightSelections = highlight) {
                    val current by state.collectAsState()
                    ReadStateContent(current, { state.value = ReadState.Ready("Recuperado") }, "Carregando") { Text(it) }
                }
            }
        }
        compose.waitForIdle()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_TAB)
        compose.waitForIdle()
        compose.onNodeWithText("Tentar novamente").assertIsFocused()
        capture(if (highlight) "focus-yellow" else "focus-neutral")
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_ENTER)
        compose.onNodeWithText("Recuperado").assertIsDisplayed()
    }

    @Test fun retryWorksWithTheKeyboardAndNeutralFocus() = retryWithKeyboard(false)
    @Test fun retryWorksWithTheKeyboardAndYellowHighlight() = retryWithKeyboard(true)

    @Test fun retryRemainsReachableWithLargeText() {
        mount {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale = 2f)) {
                ReadStateContent(ReadState.Failed, {}, "Carregando") { _: Unit -> }
            }
        }
        compose.onNodeWithText("Tentar novamente").performScrollTo().assertIsDisplayed()
        capture("large-text")
    }

    @Test fun reducedMotionKeepsThePencilStillAndTheNormalSettingAnimatesIt() {
        val reduced = MutableStateFlow(true)
        compose.mainClock.autoAdvance = false
        compose.activityRule.scenario.onActivity { activity ->
            activity.setContent {
                val reduceMotion by reduced.collectAsState()
                OlenaTheme(reduceMotion = reduceMotion) {
                    ReadStateContent(ReadState.Loading, {}, "Carregando agenda") { _: Unit -> }
                }
            }
        }
        compose.mainClock.advanceTimeByFrame()
        val still = compose.onRoot().captureToImage().asAndroidBitmap()
        compose.mainClock.advanceTimeBy(1000)
        assertTrue(still.sameAs(compose.onRoot().captureToImage().asAndroidBitmap()))
        compose.runOnUiThread { reduced.value = false }
        compose.mainClock.advanceTimeByFrame()
        compose.mainClock.advanceTimeBy(1000)
        assertFalse(still.sameAs(compose.onRoot().captureToImage().asAndroidBitmap()))
    }
}
