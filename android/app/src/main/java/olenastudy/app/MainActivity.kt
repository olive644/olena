package olenastudy.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.data.agenda.TaskRepository
import olenastudy.app.focus.FocusController
import kotlinx.coroutines.launch
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.data.settings.ThemeSettings
import olenastudy.app.domain.profile.ProfileInfo
import olenastudy.app.domain.profile.ProfileLook
import olenastudy.app.ui.AppShell
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.navigation.AppDestination
import olenastudy.app.ui.navigation.AppLinkRequest
import olenastudy.app.ui.navigation.AppLinkTarget
import olenastudy.app.ui.navigation.AppLinks
import olenastudy.app.ui.navigation.browserChooser

class MainActivity : ComponentActivity() {
    private var linkSequence = 0L
    private var appLinkRequest by mutableStateOf<AppLinkRequest?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setIntent(Intent(intent).replaceExtras(null as Bundle?))
        if (savedInstanceState == null) {
            if (!receiveLink(intent, closeAfterForward = true)) return
        } else {
            val pendingRoute = savedInstanceState.getString(PENDING_LINK_ROUTE)
            AppDestination.entries.firstOrNull { it.route == pendingRoute }?.let(::requestLink)
        }
        enableEdgeToEdge()
        val settings = ThemeSettings(applicationContext)
        val focusController = FocusController(applicationContext, lifecycleScope)
        val agendaRepository = AgendaRepository(applicationContext)
        val taskRepository = TaskRepository(applicationContext)
        setContent {
            val scope = rememberCoroutineScope()
            val themeMode by remember { settings.themeMode }.collectAsStateWithLifecycle(initialValue = ThemeMode.System)
            val info by remember { settings.info }.collectAsStateWithLifecycle(initialValue = ProfileInfo())
            val look by remember { settings.look }.collectAsStateWithLifecycle(initialValue = ProfileLook())
            val dark =
                when (themeMode) {
                    ThemeMode.System -> isSystemInDarkTheme()
                    ThemeMode.Light -> false
                    ThemeMode.Dark -> true
                }
            OlenaTheme(darkTheme = dark) {
                AppShell(
                    focusController = focusController,
                    agendaRepository = agendaRepository,
                    taskRepository = taskRepository,
                    themeMode = themeMode,
                    onThemeModeChange = { mode -> scope.launch { settings.setThemeMode(mode) } },
                    look = look,
                    onLookChange = { next -> scope.launch { settings.setLook(next) } },
                    info = info,
                    onInfoChange = { next -> scope.launch { settings.setInfo(next) } },
                    appLinkRequest = appLinkRequest,
                    onAppLinkHandled = { id -> if (appLinkRequest?.id == id) appLinkRequest = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        val incoming = Intent(intent).replaceExtras(null as Bundle?)
        super.onNewIntent(incoming)
        receiveLink(incoming, closeAfterForward = false)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString(PENDING_LINK_ROUTE, appLinkRequest?.destination?.route)
        super.onSaveInstanceState(outState)
    }

    private fun requestLink(destination: AppDestination) {
        appLinkRequest = AppLinkRequest(++linkSequence, destination)
    }

    private fun receiveLink(incoming: Intent, closeAfterForward: Boolean): Boolean {
        if (incoming.action != Intent.ACTION_VIEW) return true
        when (val target = AppLinks.resolve(incoming.dataString)) {
            is AppLinkTarget.Native -> {
                requestLink(target.destination)
                return true
            }
            is AppLinkTarget.Website -> {
                try {
                    startActivity(browserChooser(this, target.url))
                } catch (_: ActivityNotFoundException) {
                    Toast.makeText(this, R.string.link_browser_unavailable, Toast.LENGTH_LONG).show()
                }
            }
            AppLinkTarget.Rejected -> Toast.makeText(this, R.string.link_not_supported, Toast.LENGTH_LONG).show()
        }
        if (closeAfterForward) finish()
        return !closeAfterForward
    }

    private companion object {
        const val PENDING_LINK_ROUTE = "pendingAppLinkRoute"
    }
}
