package olenastudy.app.ui.focus

import android.view.KeyEvent
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.unit.Density
import androidx.lifecycle.lifecycleScope
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.io.IOException
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CompletableDeferred
import olenastudy.app.MainActivity
import olenastudy.app.data.ReadState
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.data.agenda.TaskRepository
import olenastudy.app.data.focus.FocusMode
import olenastudy.app.data.focus.FocusPersistence
import olenastudy.app.data.focus.FocusRecordsCodec
import olenastudy.app.data.focus.FocusSnapshot
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.domain.focus.FocusRecord
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.StopwatchState
import olenastudy.app.focus.FocusController
import olenastudy.app.ui.AppShell
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.screens.FocusScreen
import olenastudy.app.ui.screens.LocalFocusController
import olenastudy.app.ui.screens.StudySettingsContent
import olenastudy.app.ui.navigation.awaitAppReady
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FocusReadTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private val saved = FocusSnapshot(
        Pomodoro.initial(PomodoroConfig(focusMinutes = 50)), PomodoroConfig(focusMinutes = 50),
        FocusMode.Timer, StopwatchState(accumulatedMs = 120_000),
        listOf(FocusRecord(System.currentTimeMillis(), 15)),
    )

    private class Store(private val read: suspend () -> FocusSnapshot) : FocusPersistence {
        val reads = AtomicInteger()
        val writes = AtomicInteger()
        override suspend fun load(): FocusSnapshot { reads.incrementAndGet(); return read() }
        override suspend fun save(snapshot: FocusSnapshot) { writes.incrementAndGet() }
    }

    private fun mount(store: Store, content: @Composable (FocusController) -> Unit = { FocusScreen(it) }): FocusController {
        lateinit var controller: FocusController
        compose.activityRule.scenario.onActivity { activity ->
            controller = FocusController(store, activity.lifecycleScope, System::currentTimeMillis, {})
            activity.setContent {
                OlenaTheme {
                    Box(Modifier.fillMaxSize().background(OlenaTheme.colors.page)) { content(controller) }
                }
            }
        }
        return controller
    }

    private fun capture(name: String) {
        val prefix = InstrumentationRegistry.getArguments().getString("evidenceName") ?: return
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "focus-read-evidence").apply { mkdirs() }
        val bitmap = compose.onRoot().captureToImage().asAndroidBitmap()
        File(directory, "$prefix-$name.png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
    }

    @Test fun aPendingFocusReadDoesNotShowOrSaveAResetClock() {
        val gate = CompletableDeferred<FocusSnapshot>()
        val store = Store { gate.await() }
        val controller = mount(store)
        compose.onNodeWithText("Carregando seu foco…").assertIsDisplayed()
        compose.onNodeWithContentDescription("00:00:00").assertDoesNotExist()
        compose.onNodeWithText("Começar").assertDoesNotExist()
        controller.toggleStopwatch()
        controller.resetStopwatch()
        compose.waitForIdle()
        assertEquals(0, store.writes.get())
        capture("focus-loading")
        gate.complete(saved)
        compose.waitUntil(10_000) { controller.state.value is ReadState.Ready }
        compose.onNodeWithContentDescription("00:02:00").assertIsDisplayed()
        compose.onNodeWithText("Continuar").performScrollTo().assertIsDisplayed()
        capture("focus-ready")
        assertEquals(0, store.writes.get())
    }

    @Test fun aFailedReadCanBeRetriedWithTheKeyboardWithoutReplacingHistory() {
        val attempts = AtomicInteger()
        val store = Store { if (attempts.incrementAndGet() == 1) throw IOException("private path") else saved }
        val controller = mount(store)
        compose.onNodeWithText("Não foi possível ler seus dados").assertIsDisplayed()
        compose.onNodeWithText("private path").assertDoesNotExist()
        capture("focus-error")
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_TAB)
        compose.onNodeWithText("Tentar novamente").assertIsFocused()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_ENTER)
        compose.waitUntil(10_000) { controller.state.value is ReadState.Ready }
        compose.onNodeWithContentDescription("00:02:00").assertIsDisplayed()
        capture("focus-recovered")
        assertEquals(2, store.reads.get())
        assertEquals(0, store.writes.get())
        compose.runOnIdle { assertEquals(saved.records, (controller.state.value as ReadState.Ready).value.records) }
    }

    @Test fun brokenJsonDoesNotUnlockAnEmptyHistoryOrAllowEditing() {
        val broken = "[{broken"
        val store = Store { saved.copy(records = FocusRecordsCodec.decode(broken)) }
        val controller = mount(store)
        compose.onNodeWithText("Tentar novamente").assertIsDisplayed().performClick()
        compose.onNodeWithText("Não foi possível ler seus dados").assertIsDisplayed()
        compose.onNodeWithContentDescription("00:00:00").assertDoesNotExist()
        controller.setConfig(PomodoroConfig())
        controller.restartPhase()
        compose.waitForIdle()
        assertEquals(0, store.writes.get())
        assertEquals(2, store.reads.get())
    }

    @Test fun studySettingsWaitForTheSavedFocusDurations() {
        val gate = CompletableDeferred<FocusSnapshot>()
        val store = Store { gate.await() }
        val controller = mount(store) { controller ->
            CompositionLocalProvider(LocalFocusController provides controller) {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) { StudySettingsContent() }
            }
        }
        compose.onNodeWithText("Carregando seu foco…").assertIsDisplayed()
        compose.onNodeWithText("Seu ritmo de foco").assertDoesNotExist()
        capture("settings-loading")
        gate.complete(saved)
        compose.waitUntil(10_000) { controller.state.value is ReadState.Ready }
        compose.onNodeWithText("50 minutos").performScrollTo().assertIsDisplayed()
        capture("settings-ready")
        assertEquals(0, store.writes.get())
    }

    @Test fun settingsRecoveryRemainsReachableWithLargeTextAndParentScrolling() {
        val attempts = AtomicInteger()
        val store = Store { if (attempts.incrementAndGet() == 1) throw IOException() else saved }
        mount(store) { controller ->
            val density = LocalDensity.current
            CompositionLocalProvider(LocalFocusController provides controller, LocalDensity provides Density(density.density, 2f)) {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) { StudySettingsContent() }
            }
        }
        compose.onNodeWithText("Tentar novamente").performScrollTo().assertIsDisplayed()
        capture("settings-error-large")
        compose.onNodeWithText("Tentar novamente").performClick()
        compose.onNodeWithText("50 minutos").performScrollTo().assertIsDisplayed()
        assertEquals(0, store.writes.get())
    }

    @Test fun theStudentSpaceWaitsForFocusHistoryBeforeShowingItsSummary() {
        val gate = CompletableDeferred<FocusSnapshot>()
        val store = Store { gate.await() }
        mount(store) { controller ->
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            AppShell(controller, AgendaRepository(context), TaskRepository(context), ThemeMode.System, {})
        }
        compose.onNodeWithText("Carregando seu resumo…").assertIsDisplayed()
        compose.onNodeWithText("Explorar Matemática").assertDoesNotExist()
        capture("home-loading")
        gate.complete(saved)
        compose.awaitAppReady()
        compose.onNodeWithText("Explorar Matemática").assertIsDisplayed()
        compose.onNodeWithContentDescription("15").performScrollTo().assertIsDisplayed()
        capture("home-ready")
        assertEquals(0, store.writes.get())
    }
}
