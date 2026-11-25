package olenastudy.app.ui.navigation

import android.app.Activity
import android.app.Instrumentation
import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.view.KeyEvent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.core.content.IntentCompat
import androidx.core.util.Consumer
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import olenastudy.app.MainActivity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.atomic.AtomicBoolean

@RunWith(AndroidJUnit4::class)
class AppLinksTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private fun openSettings() {
        compose.onNodeWithText("Perfil").performClick()
        compose.onNodeWithContentDescription("Configurações").performClick()
    }

    private fun deliverLink(url: String) {
        val delivered = AtomicBoolean(false)
        val listener = Consumer<Intent> { delivered.set(true) }
        compose.runOnUiThread {
            compose.activity.addOnNewIntentListener(listener)
            compose.activity.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(url), compose.activity, MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            )
        }
        try {
            compose.waitUntil(timeoutMillis = 10_000) { delivered.get() }
            compose.waitForIdle()
        } finally {
            compose.runOnUiThread { compose.activity.removeOnNewIntentListener(listener) }
        }
    }

    private fun back() {
        compose.waitForIdle()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_BACK)
        compose.waitForIdle()
    }

    @Test
    fun aWarmFocusLinkLeavesSettingsAndBackReturnsToTheStudentSpace() {
        openSettings()
        deliverLink("https://www.olenastudy.com.br/foco")
        compose.onNodeWithText("Foco").assertIsSelected()
        compose.onNodeWithText("Começar").assertIsDisplayed()
        back()
        compose.onNodeWithText("Espaço").assertIsSelected()
    }

    @Test
    fun repeatedLinksDoNotAddBackSteps() {
        repeat(3) { deliverLink("https://olenastudy.com.br/foco") }
        back()
        compose.onNodeWithText("Espaço").assertIsSelected()
    }

    @Test
    fun supportedLinksSelectTheExpectedTabs() {
        for ((path, label) in listOf(
            "/planejador" to "Agenda", "/aprender" to "Praticar", "/perfil" to "Perfil",
            "/habitos" to "Perfil", "/" to "Espaço",
        )) {
            deliverLink("https://olenastudy.com.br$path")
            compose.onNodeWithText(label).assertIsSelected()
        }
    }

    @Test
    fun aDirectProfileLinkDoesNotRestoreSavedSettings() {
        openSettings()
        compose.onNodeWithContentDescription("Estudo e foco").performClick()
        compose.onNodeWithText("Agenda").performClick()
        deliverLink("https://www.olenastudy.com.br/perfil")
        compose.onNodeWithContentDescription("Editar perfil").assertIsDisplayed()
        compose.onNodeWithText("Agenda").performClick()
        compose.onNodeWithText("Perfil").performClick()
        compose.onNodeWithContentDescription("Editar perfil").assertIsDisplayed()
    }

    @Test
    fun aWarmLinkIsNotReplayedAfterRecreation() {
        deliverLink("https://www.olenastudy.com.br/foco")
        compose.onNodeWithText("Agenda").performClick()
        compose.activityRule.scenario.recreate()
        compose.onNodeWithText("Agenda").assertIsSelected()
    }

    @Test
    fun publicProfileLinksUseTheBrowserWithoutChangingTheOpenScreen() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val monitor = instrumentation.addMonitor(
            IntentFilter(Intent.ACTION_CHOOSER),
            Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null),
            true,
        )
        try {
            openSettings()
            deliverLink("https://www.olenastudy.com.br/perfil?usuario=teste")
            compose.waitUntil(timeoutMillis = 5_000) { monitor.hits == 1 }
            compose.onNodeWithText("Configurações").assertIsDisplayed()
            compose.onNodeWithContentDescription("Conta").assertIsDisplayed()
        } finally {
            instrumentation.removeMonitor(monitor)
        }
    }

    @Test
    fun foreignLinksDoNotChangeTheOpenScreen() {
        compose.onNodeWithText("Agenda").performClick()
        deliverLink("https://outro.example/foco")
        compose.onNodeWithText("Agenda").assertIsSelected()
    }

    @Test
    fun browserChooserPreservesTheUrlAndExcludesThisApp() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val url = "https://www.olenastudy.com.br/perfil?usuario=teste&origem=qr"
        val chooser = browserChooser(context, url)
        val view = IntentCompat.getParcelableExtra(chooser, Intent.EXTRA_INTENT, Intent::class.java)
        val excluded = IntentCompat.getParcelableArrayExtra(chooser, Intent.EXTRA_EXCLUDE_COMPONENTS, ComponentName::class.java)
        assertEquals(Intent.ACTION_CHOOSER, chooser.action)
        assertEquals(url, view?.dataString)
        assertTrue(excluded?.contains(ComponentName(context, MainActivity::class.java)) == true)
    }

    @Test
    fun manifestOnlyClaimsImplementedPathsOnTheOfficialHosts() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        fun resolves(url: String): Boolean {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                .addCategory(Intent.CATEGORY_BROWSABLE)
                .setPackage(context.packageName)
            return context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
                .any { it.activityInfo.name == MainActivity::class.java.name }
        }
        for (host in listOf("www.olenastudy.com.br", "olenastudy.com.br")) {
            for (path in listOf("/", "/planejador", "/aprender/", "/foco", "/perfil", "/habitos/")) {
                assertTrue("$host$path", resolves("https://$host$path"))
            }
        }
        for (path in listOf("/biblioteca", "/cadernos", "/aulas", "/atividades", "/notificacoes", "/politica-de-privacidade.html", "/foco/parte")) {
            assertTrue(path, !resolves("https://www.olenastudy.com.br$path"))
        }
        assertTrue(!resolves("https://outro.example/foco"))
        assertTrue(!resolves("http://www.olenastudy.com.br/foco"))
    }
}
