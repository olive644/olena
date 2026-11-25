package olenastudy.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.lifecycleScope
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.focus.FocusController
import kotlinx.coroutines.launch
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.data.settings.ThemeSettings
import olenastudy.app.ui.AppShell
import olenastudy.app.ui.OlenaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val settings = ThemeSettings(applicationContext)
        val focusController = FocusController(applicationContext, lifecycleScope)
        val agendaRepository = AgendaRepository(applicationContext)
        setContent {
            val scope = rememberCoroutineScope()
            val themeMode by remember { settings.themeMode }.collectAsStateWithLifecycle(initialValue = ThemeMode.System)
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
                    themeMode = themeMode,
                    onThemeModeChange = { mode -> scope.launch { settings.setThemeMode(mode) } },
                )
            }
        }
    }
}
