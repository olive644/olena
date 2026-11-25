package olenastudy.app.ui.navigation

import android.view.KeyEvent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import olenastudy.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppNavigationTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private fun openSettings() {
        compose.onNodeWithText("Perfil").performClick()
        compose.onNodeWithContentDescription("Configurações").performClick()
        compose.onNodeWithText("Configurações").assertIsDisplayed()
    }

    private fun openStudySettings() {
        openSettings()
        compose.onNodeWithContentDescription("Estudo e foco").performClick()
        compose.onNodeWithText("Seu ritmo de foco").assertIsDisplayed()
    }

    private fun back() {
        compose.waitForIdle()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK)
        compose.waitForIdle()
    }

    @Test
    fun backReturnsThroughTheSettingsHierarchy() {
        openStudySettings()
        back()
        compose.onNodeWithContentDescription("Conta").assertIsDisplayed()
        back()
        compose.onNodeWithContentDescription("Editar perfil").assertIsDisplayed()
        compose.onNodeWithText("Perfil").assertIsSelected()
    }

    @Test
    fun toolbarBackAnnouncesAndUsesTheSameHierarchy() {
        openStudySettings()
        compose.onNodeWithContentDescription("Voltar às configurações").performClick()
        compose.onNodeWithContentDescription("Conta").assertIsDisplayed()
        compose.onNodeWithContentDescription("Voltar ao perfil").performClick()
        compose.onNodeWithContentDescription("Editar perfil").assertIsDisplayed()
    }

    @Test
    fun recreationPreservesTheSectionAndItsReturnPath() {
        openStudySettings()
        compose.activityRule.scenario.recreate()
        compose.onNodeWithText("Seu ritmo de foco").assertIsDisplayed()
        back()
        compose.onNodeWithContentDescription("Conta").assertIsDisplayed()
        back()
        compose.onNodeWithContentDescription("Editar perfil").assertIsDisplayed()
    }

    @Test
    fun selectingTheCurrentProfileTabReturnsToItsRoot() {
        openStudySettings()
        compose.onNodeWithText("Perfil").performClick()
        compose.onNodeWithContentDescription("Editar perfil").assertIsDisplayed()
        back()
        compose.onNodeWithText("Explorar Matemática").assertIsDisplayed()
    }

    @Test
    fun switchingTabsPreservesTheSettingsSection() {
        openStudySettings()
        compose.onNodeWithText("Agenda").performClick()
        compose.onNodeWithText("Perfil").performClick()
        compose.onNodeWithText("Seu ritmo de foco").assertIsDisplayed()
        compose.onNodeWithText("Perfil").assertIsSelected()
    }

    @Test
    fun backDismissesADialogBeforeLeavingItsSection() {
        openSettings()
        compose.onNodeWithContentDescription("Conversar com o time").performClick()
        compose.onNodeWithText("Iniciar conversa").performClick()
        compose.onNodeWithText("Em breve no app").assertIsDisplayed()
        back()
        compose.onNodeWithText("Em breve no app").assertDoesNotExist()
        compose.onNodeWithText("Iniciar conversa").assertIsDisplayed()
        back()
        compose.onNodeWithContentDescription("Conta").assertIsDisplayed()
    }

    @Test
    fun backFromAnotherTabReturnsToTheStudentSpace() {
        compose.onNodeWithText("Agenda").performClick()
        back()
        compose.onNodeWithText("Espaço").assertIsSelected()
        compose.onNodeWithText("Explorar Matemática").assertIsDisplayed()
    }
}
