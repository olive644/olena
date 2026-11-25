package olenastudy.app.ui.navigation

import android.content.Intent
import android.net.Uri
import android.view.KeyEvent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.v2.createEmptyComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import olenastudy.app.MainActivity
import org.junit.Rule
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppLinkColdStartTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    @Test
    fun focusLinkStartsAtFocusAndBackReturnsToTheStudentSpace() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.olenastudy.com.br/foco"), context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        ActivityScenario.launch<MainActivity>(intent).use {
            compose.onNodeWithText("Foco").assertIsSelected()
            compose.onNodeWithText("Começar").assertIsDisplayed()
            compose.waitForIdle()
            InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK)
            compose.onNodeWithText("Espaço").assertIsSelected()
        }
    }

    @Test
    fun recreationDoesNotReplayAnAlreadyHandledLink() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.olenastudy.com.br/foco"), context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        ActivityScenario.launch<MainActivity>(intent).use { scenario ->
            compose.onNodeWithText("Foco").assertIsSelected()
            compose.onNodeWithText("Agenda").performClick()
            scenario.recreate()
            compose.onNodeWithText("Agenda").assertIsSelected()
        }
    }

    @Test
    fun untrustedNavigationExtrasAreNotPassedToTheNavHost() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://olenastudy.com.br/foco"), context, MainActivity::class.java)
            .putExtra("android-support-nav:controller:deepLinkIds", intArrayOf(-1, 0))
            .putExtra("route", AppDestination.SETTINGS_ROUTE)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        ActivityScenario.launch<MainActivity>(intent).use { scenario ->
            compose.onNodeWithText("Foco").assertIsSelected()
            scenario.onActivity { assertNull(it.intent.extras) }
        }
    }
}
