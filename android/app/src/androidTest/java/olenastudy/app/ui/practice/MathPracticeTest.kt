package olenastudy.app.ui.practice

import android.view.KeyEvent
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.serialization.json.Json
import olenastudy.app.MainActivity
import olenastudy.app.domain.practice.*
import olenastudy.app.ui.navigation.awaitAppReady
import olenastudy.app.ui.screens.mathNumber
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class MathPracticeTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val bank by lazy {
        val assets = InstrumentationRegistry.getInstrumentation().targetContext.assets
        MathQuestionBank(assets.open("practice/math-bank.json").bufferedReader().use { Json.decodeFromString<MathBankFile>(it.readText()) })
    }
    @Before fun ready() {
        compose.awaitAppReady()
        compose.waitUntil(10_000) { compose.activity.hasWindowFocus() }
    }

    private fun waitFor(text: String) = compose.waitUntil(15_000) { compose.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty() }
    private fun click(text: String) {
        val node = compose.onNode(hasText(text) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        if (!node.isDisplayed()) node.performScrollTo()
        node.performTouchInput { click() }
    }
    private fun enter() {
        compose.onNodeWithText("Praticar").performClick()
        waitFor("Explorar Matemática")
        click("Explorar Matemática")
        waitFor("Pátio das Primeiras Contas")
    }
    private fun play() {
        enter()
        click("Explorar Ensino fundamental")
        click("Praticar")
        waitFor(bank.question("foundations", 1, 1).entry.expression)
    }
    private fun back() {
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK)
        compose.waitForIdle()
    }
    private fun capture(name: String) {
        val prefix = InstrumentationRegistry.getArguments().getString("evidenceName") ?: return
        compose.waitForIdle()
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "practice-evidence").apply { mkdirs() }
        val bitmap = compose.onRoot().captureToImage().asAndroidBitmap()
        File(directory, "$prefix-$name.png").outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
    }

    @Test fun courseNavigationPreservesAccountGateAndBackHierarchy() {
        enter()
        capture("map")
        click("Próximo")
        compose.onNodeWithText("Oficina das Equações").assertIsDisplayed()
        compose.onNodeWithText("Progresso da conta necessário").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Explorar Ensino médio").assertDoesNotExist()
        capture("account-gate")
        click("Anterior")
        click("Explorar Ensino fundamental")
        back()
        waitFor("Voltar às ilhas")
        compose.onNodeWithText("Pátio das Primeiras Contas").assertIsDisplayed()
        back()
        waitFor("Picos dos Padrões")
        compose.onNodeWithText("Picos dos Padrões").performScrollTo().assertIsDisplayed()
    }

    @Test fun keyboardAnswerPauseRecreationAndExitWorkWithoutSavingAnAccount() {
        play()
        val q = bank.question("foundations", 1, 1)
        // Navegação real muda a modalidade para teclado antes de conferir o foco.
        val keyboardTargets = compose.onAllNodes(isFocusable()).fetchSemanticsNodes().size
        repeat(keyboardTargets + 1) {
            if (compose.onAllNodes(hasContentDescription("Opção 1: ${mathNumber(q.choices.first())}") and isFocused()).fetchSemanticsNodes().isEmpty()) {
                InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_TAB)
                compose.waitForIdle()
            }
        }
        compose.onNodeWithContentDescription("Opção 1: ${mathNumber(q.choices.first())}").assertIsFocused()
        capture("question-keyboard")
        val index = q.choices.indexOf(q.entry.answer)
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_1 + index)
        waitFor("Correto!")
        compose.onNodeWithContentDescription("3 de 3 vidas").assertIsDisplayed()
        val score = compose.onNode(hasText("pontos", substring = true)).fetchSemanticsNode().config[SemanticsProperties.Text].first().text
        click("Pausar")
        compose.onNodeWithText("Rodada pausada").assertIsDisplayed()
        capture("paused")
        click("Continuar")
        compose.activityRule.scenario.recreate()
        compose.awaitAppReady()
        waitFor("Rodada pausada")
        click("Continuar")
        compose.onNodeWithText(score).assertIsDisplayed()
        click("Sair")
        compose.onNodeWithText("Sair da rodada?").assertIsDisplayed()
        capture("exit")
        click("Continuar rodada")
        click("Sair")
        click("Sair da rodada")
        compose.onNodeWithText("Pátio das Primeiras Contas").assertIsDisplayed()
    }

    @Test fun threeWrongAnswersRequireReviewBeforeRetry() {
        play()
        var progress = MathMasteryProgress()
        repeat(3) { index ->
            val q = MathMastery.next("foundations", progress, bank)
            waitFor(q.entry.expression)
            val choice = q.choices.first { it != q.entry.answer }
            val option = q.choices.indexOf(choice) + 1
            compose.onNodeWithContentDescription("Opção $option: ${mathNumber(choice)}").performScrollTo().performTouchInput { click() }
            progress = MathMastery.assess("foundations", progress, q, choice, 1.0, 0, bank).progress
            compose.onNodeWithContentDescription("${2 - index} de 3 vidas").assertIsDisplayed()
        }
        waitFor("Vamos revisar")
        capture("review")
        compose.onNodeWithText("Tentar novamente").assertDoesNotExist()
        repeat(2) { click("Próxima revisão") }
        click("Ver resultado")
        compose.onNodeWithText("Rodada concluída").assertIsDisplayed()
        capture("results")
        click("Tentar novamente")
        compose.waitUntil(15_000) { compose.onAllNodesWithContentDescription("3 de 3 vidas").fetchSemanticsNodes().isNotEmpty() }
    }
}
