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
import androidx.compose.ui.graphics.Color
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
import olenastudy.app.ui.screens.HomeScreen
import olenastudy.app.ui.screens.HomeSummary
import androidx.compose.runtime.remember
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.LocalDate
import java.time.ZoneId
import olenastudy.app.domain.agenda.Agenda
import olenastudy.app.domain.focus.FocusFlower
import olenastudy.app.ui.screens.FocusScreen
import olenastudy.app.ui.components.PaperDecoration
import olenastudy.app.ui.components.paperPanel
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
    val focusSnapshot by focusController.snapshot.collectAsStateWithLifecycle()
    val events by agendaRepository.events.collectAsStateWithLifecycle(initialValue = emptyList())
    val summary =
        remember(focusSnapshot.records, events) {
            val nowMs = System.currentTimeMillis()
            val flower = FocusFlower.state(focusSnapshot.records, nowMs, ZoneId.systemDefault())
            HomeSummary(
                pendingTasks = 0,
                focusMinutesToday = flower.minutesToday,
                agendaToday = Agenda.eventsOn(events, LocalDate.now().toString()).size,
                flowerBloomed = flower.progress >= 0.5,
            )
        }
    fun onNavigate(destination: AppDestination) {
        navController.navigate(destination.route) {
            popUpTo(AppDestination.start.route) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    Box(Modifier.fillMaxSize().background(colors.page)) {
    PaperDecoration()
    Column(
        modifier = Modifier.fillMaxSize(),
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .statusBarsPadding(),
        ) {
            if (current != AppDestination.Profile) PageHeader(Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
            Box(Modifier.weight(1f).fillMaxWidth()) {
            NavHost(navController = navController, startDestination = AppDestination.start.route) {
                AppDestination.entries.forEach { destination ->
                    composable(destination.route) {
                        when (destination) {
                            AppDestination.Profile -> ProfileScreen(themeMode = themeMode, onThemeModeChange = onThemeModeChange)
                            AppDestination.Today -> HomeScreen(summary, onExploreMath = { onNavigate(AppDestination.Learn) })
                            AppDestination.Focus -> FocusScreen(focusController)
                            AppDestination.Planner -> AgendaScreen(agendaRepository)
                            else -> InProgressScreen(destination.titleRes())
                        }
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
}

/**
 * Barra de navegação de papel. Sem pílula nem moldura de foco: o destino ativo usa o ícone roxo,
 * o rótulo em violeta e um sublinhado amarelo, como o site marca a seleção.
 */
@Composable
fun PaperNavigationBar(current: AppDestination, onSelect: (AppDestination) -> Unit) {
    val colors = OlenaTheme.colors
    val description = stringResource(R.string.nav_bar_description)
    Box(modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .paperPanel(
                    fill = if (colors.isDark) colors.surface else colors.page,
                    base = if (colors.isDark) colors.lineStrong else Color(0xFFC8BAA4),
                    facetLight = if (colors.isDark) colors.soft else Color(0xFFEEE5D5),
                    facetDark = if (colors.isDark) colors.line else Color(0xFFE6DAC3),
                    border = Color.Transparent,
                    shape = RoundedCornerShape(topStart = 14.dp, topEnd = 22.dp, bottomEnd = 16.dp, bottomStart = 19.dp),
                    radius = 19.dp,
                    facet = 26.dp,
                    shift = 7.dp,
                )
                .semantics { contentDescription = description }
                .padding(horizontal = 4.dp, vertical = 8.dp),
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
            .width(58.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Tab, onClick = onClick)
            .semantics { this.selected = selected }
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Selecionado: tile violeta com a faceta clara e a base escura, como no site; o ícone dentro
        // é o da variante escura. Os outros usam o ícone do tema.
        val iconRes = if (selected && destination != AppDestination.Profile) destination.icon(false, true) else destination.icon(selected, colors.isDark)
        Box(
            modifier = if (selected) Modifier.size(width = 38.dp, height = 33.dp).paperTile() else Modifier.size(width = 38.dp, height = 33.dp),
            contentAlignment = Alignment.Center,
        ) {
            Image(painter = painterResource(iconRes), contentDescription = null, modifier = Modifier.size(if (destination == AppDestination.Profile) 32.dp else 30.dp))
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = colors.text,
            maxLines = 1,
        )
    }
}

private val TileShape = RoundedCornerShape(topStart = 7.dp, topEnd = 13.dp, bottomEnd = 8.dp, bottomStart = 11.dp)

/** Tile violeta do destino ativo: faceta clara no canto, canto escuro e base deslocada. */
private fun Modifier.paperTile(): Modifier =
    this.paperPanel(
        fill = Color(0xFF7433E0),
        base = Color(0xFF4B209B),
        facetLight = Color(0xFF8A4CE5),
        facetDark = Color(0xFF5C28B5),
        border = Color.Transparent,
        shape = TileShape,
        radius = 11.dp,
        facet = 11.dp,
        shift = 4.dp,
    )

/** Cabeçalho de papel de todas as telas: cartão com o sino de atualizações do sistema. */
@Composable
fun PageHeader(modifier: Modifier = Modifier) {
    val colors = OlenaTheme.colors
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(68.dp)
            .paperPanel(
                fill = if (colors.isDark) colors.surface else colors.page,
                base = if (colors.isDark) colors.lineStrong else Color(0xFFC8BAA4),
                facetLight = if (colors.isDark) colors.soft else Color(0xFFEEE5D5),
                facetDark = if (colors.isDark) colors.line else Color(0xFFE6DAC3),
                border = Color.Transparent,
                shape = RoundedCornerShape(topStart = 14.dp, topEnd = 22.dp, bottomEnd = 16.dp, bottomStart = 19.dp),
                radius = 19.dp,
                facet = 30.dp,
                shift = 5.dp,
            ),
    ) {
        Image(
            painter = painterResource(if (colors.isDark) R.drawable.art_bell_dark else R.drawable.art_bell_light),
            contentDescription = stringResource(R.string.header_updates),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp)
                .size(width = 58.dp, height = 44.dp),
        )
    }
}
