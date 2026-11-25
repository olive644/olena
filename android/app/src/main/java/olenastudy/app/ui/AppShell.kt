package olenastudy.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import olenastudy.app.R
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.focus.FocusController
import olenastudy.app.ui.screens.AgendaScreen
import olenastudy.app.ui.screens.FocusScreen
import olenastudy.app.ui.navigation.AppDestination
import olenastudy.app.ui.screens.InProgressScreen
import olenastudy.app.ui.screens.ProfileScreen
import olenastudy.app.ui.screens.titleRes

/** Casca do app: conteúdo do destino atual e a barra de navegação de papel embaixo. */
@Composable
fun AppShell(
    focusController: FocusController,
    agendaRepository: AgendaRepository,
    themeMode: ThemeMode,
    onThemeModeChange: (ThemeMode) -> Unit,
) {
    val colors = OlenaTheme.colors
    val navController = rememberNavController()
    val entry by navController.currentBackStackEntryAsState()
    val current = AppDestination.fromRoute(entry?.destination?.route)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.page),
    ) {
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .statusBarsPadding(),
        ) {
            NavHost(navController = navController, startDestination = AppDestination.start.route) {
                AppDestination.entries.forEach { destination ->
                    composable(destination.route) {
                        when (destination) {
                            AppDestination.Profile -> ProfileScreen(themeMode = themeMode, onThemeModeChange = onThemeModeChange)
                            AppDestination.Focus -> FocusScreen(focusController)
                            AppDestination.Planner -> AgendaScreen(agendaRepository)
                            else -> InProgressScreen(destination.titleRes())
                        }
                    }
                }
            }
        }
        PaperNavigationBar(
            current = current,
            onSelect = { destination ->
                if (destination != current) {
                    navController.navigate(destination.route) {
                        popUpTo(AppDestination.start.route) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            },
        )
    }
}

/**
 * Barra de navegação de papel. Sem pílula nem moldura de foco: o destino ativo usa o ícone roxo,
 * o rótulo em violeta e um sublinhado amarelo, como o site marca a seleção.
 */
@Composable
private fun PaperNavigationBar(current: AppDestination, onSelect: (AppDestination) -> Unit) {
    val colors = OlenaTheme.colors
    val description = stringResource(R.string.nav_bar_description)
    Column(modifier = Modifier.background(colors.surface)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(colors.line))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .semantics { contentDescription = description }
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            AppDestination.entries.forEach { destination ->
                NavigationItem(destination, selected = destination == current, onClick = { onSelect(destination) })
            }
        }
    }
}

@Composable
private fun NavigationItem(destination: AppDestination, selected: Boolean, onClick: () -> Unit) {
    val colors = OlenaTheme.colors
    val label = stringResource(destination.label)
    Column(
        modifier = Modifier
            .width(60.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Tab, onClick = onClick)
            .semantics { this.selected = selected }
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(destination.icon(selected, colors.isDark)),
            contentDescription = null,
            modifier = Modifier.size(30.dp),
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
            color = if (selected) colors.violet else colors.muted,
        )
        Box(
            modifier = Modifier
                .padding(top = 2.dp)
                .width(18.dp)
                .height(3.dp)
                .background(if (selected) colors.yellow else androidx.compose.ui.graphics.Color.Transparent, RoundedCornerShape(2.dp)),
        )
    }
}
