package olenastudy.app.ui.screens

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import olenastudy.app.R
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.PaperCard
import olenastudy.app.ui.navigation.AppDestination

/** Base de toda tela: rolagem, margem e título em Manrope. */
@Composable
fun ScreenScaffold(
    @StringRes title: Int,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = stringResource(title),
            style = MaterialTheme.typography.headlineLarge,
            color = OlenaTheme.colors.text,
        )
        content()
    }
}

/** Tela que ainda não existe no app nativo. Diz isso claramente, sem dados de mentira. */
@Composable
fun InProgressScreen(@StringRes title: Int) {
    ScreenScaffold(title) {
        PaperCard(Modifier.fillMaxWidth()) {
            Text(
                text = stringResource(R.string.screen_in_progress),
                style = MaterialTheme.typography.bodyLarge,
                color = OlenaTheme.colors.muted,
            )
        }
    }
}

@Composable
fun ProfileScreen(themeMode: ThemeMode, onThemeModeChange: (ThemeMode) -> Unit) {
    ScreenScaffold(R.string.screen_profile_title) {
        PaperCard(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = stringResource(R.string.profile_appearance_title),
                    style = MaterialTheme.typography.titleLarge,
                    color = OlenaTheme.colors.text,
                )
                Text(
                    text = stringResource(R.string.profile_appearance_hint),
                    style = MaterialTheme.typography.bodyMedium,
                    color = OlenaTheme.colors.muted,
                )
                ThemeChoice(R.string.theme_system, ThemeMode.System, themeMode, onThemeModeChange)
                ThemeChoice(R.string.theme_light, ThemeMode.Light, themeMode, onThemeModeChange)
                ThemeChoice(R.string.theme_dark, ThemeMode.Dark, themeMode, onThemeModeChange)
            }
        }
    }
}

@Composable
private fun ThemeChoice(
    @StringRes label: Int,
    mode: ThemeMode,
    current: ThemeMode,
    onChange: (ThemeMode) -> Unit,
) {
    PaperButton(
        text = stringResource(label),
        onClick = { onChange(mode) },
        modifier = Modifier.fillMaxWidth(),
        style = if (mode == current) PaperButtonStyle.Primary else PaperButtonStyle.Quiet,
        selected = mode == current,
    )
}

/** Título de cada destino que ainda não tem tela própria. */
fun AppDestination.titleRes(): Int =
    when (this) {
        AppDestination.Today -> R.string.screen_today_title
        AppDestination.Planner -> R.string.screen_planner_title
        AppDestination.Learn -> R.string.screen_learn_title
        AppDestination.Focus -> R.string.screen_focus_title
        AppDestination.Library -> R.string.screen_library_title
        AppDestination.Profile -> R.string.screen_profile_title
    }
