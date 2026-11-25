package olenastudy.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import olenastudy.app.R
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.domain.profile.ProfileInfo
import olenastudy.app.domain.profile.ProfileLook
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.data.agenda.TaskRepository
import olenastudy.app.domain.agenda.Tasks
import olenastudy.app.focus.FocusController
import olenastudy.app.ui.screens.AgendaScreen
import olenastudy.app.ui.screens.HomeScreen
import olenastudy.app.ui.screens.PracticeScreen
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
import olenastudy.app.ui.screens.SettingsScreen
import olenastudy.app.ui.screens.titleRes

/** Casca do app: conteúdo do destino atual e a barra de navegação de papel embaixo. */
@Composable
fun AppShell(
    focusController: FocusController,
    agendaRepository: AgendaRepository,
    taskRepository: TaskRepository,
    themeMode: ThemeMode,
    onThemeModeChange: (ThemeMode) -> Unit,
    look: ProfileLook = ProfileLook(),
    onLookChange: (ProfileLook) -> Unit = {},
    info: ProfileInfo = ProfileInfo(),
    onInfoChange: (ProfileInfo) -> Unit = {},
) {
    val colors = OlenaTheme.colors
    var settingsOpen by rememberSaveable { mutableStateOf(false) }
    var menuOpen by rememberSaveable { mutableStateOf(false) }
    // Itens do menu sem tela nativa (Modo Sala, Cadernos): mostram a tela "em construção" com o rótulo do site.
    var extraTitle by rememberSaveable { mutableStateOf<Int?>(null) }
    val navController = rememberNavController()
    val entry by navController.currentBackStackEntryAsState()
    val current = AppDestination.fromRoute(entry?.destination?.route)
    val focusSnapshot by focusController.snapshot.collectAsStateWithLifecycle()
    val events by agendaRepository.events.collectAsStateWithLifecycle(initialValue = emptyList())
    val tasks by taskRepository.tasks.collectAsStateWithLifecycle(initialValue = emptyList())
    val summary =
        remember(focusSnapshot.records, events, tasks) {
            val nowMs = System.currentTimeMillis()
            val flower = FocusFlower.state(focusSnapshot.records, nowMs, ZoneId.systemDefault())
            HomeSummary(
                pendingTasks = Tasks.pendingCount(tasks),
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
            if (current != AppDestination.Profile) PageHeader(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), onOpenMenu = { menuOpen = true })
            Box(Modifier.weight(1f).fillMaxWidth()) {
            // Mesma chegada de tela do site no celular: surge em 280 ms subindo 8 px, e a tela anterior some sem saída.
            val arrive = tween<Float>(280, easing = CubicBezierEasing(0.2f, 0.75f, 0.25f, 1f))
            val rise = tween<IntOffset>(280, easing = CubicBezierEasing(0.2f, 0.75f, 0.25f, 1f))
            val riseDistance = with(LocalDensity.current) { 8.dp.roundToPx() }
            NavHost(
                navController = navController,
                startDestination = AppDestination.start.route,
                enterTransition = { fadeIn(arrive) + slideInVertically(rise) { riseDistance } },
                exitTransition = { ExitTransition.None },
                popEnterTransition = { fadeIn(arrive) + slideInVertically(rise) { riseDistance } },
                popExitTransition = { ExitTransition.None },
            ) {
                AppDestination.entries.forEach { destination ->
                    composable(destination.route) {
                        when (destination) {
                            AppDestination.Profile ->
                                if (settingsOpen) {
                                    SettingsScreen(themeMode = themeMode, onThemeModeChange = onThemeModeChange, onBack = { settingsOpen = false })
                                } else {
                                    ProfileScreen(themeMode = themeMode, onThemeModeChange = onThemeModeChange, look = look, onLookChange = onLookChange, info = info, onInfoChange = onInfoChange, onOpenSettings = { settingsOpen = true }, onOpenMenu = { menuOpen = true })
                                }
                            AppDestination.Today -> HomeScreen(summary, onExploreMath = { onNavigate(AppDestination.Learn) })
                            AppDestination.Learn -> PracticeScreen()
                            AppDestination.Focus -> FocusScreen(focusController)
                            AppDestination.Planner -> AgendaScreen(agendaRepository, taskRepository)
                            else -> InProgressScreen(destination.titleRes())
                        }
                    }
                }
            }
            extraTitle?.let { title ->
                Column(Modifier.fillMaxSize().background(colors.page)) {
                    if (current == AppDestination.Profile) PageHeader(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), onOpenMenu = { menuOpen = true })
                    InProgressScreen(title)
                }
            }
        }
        }
        PaperNavigationBar(
            current = current,
            onSelect = { destination ->
                extraTitle = null
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
    if (menuOpen) {
        BackHandler { menuOpen = false }
        MoreMenuSheet(
            onSelect = { item ->
                menuOpen = false
                when (item) {
                    MoreMenuItem.Library -> {
                        extraTitle = null
                        onNavigate(AppDestination.Library)
                    }
                    MoreMenuItem.Room -> extraTitle = R.string.menu_room
                    MoreMenuItem.Notes -> extraTitle = R.string.menu_notes
                }
            },
            onClose = { menuOpen = false },
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
                    fill = if (colors.isDark) Color(0xFF292432) else colors.page,
                    base = if (colors.isDark) Color(0xFF17151C) else Color(0xFFC8BAA4),
                    facetLight = if (colors.isDark) Color(0xFF393244) else Color(0xFFEEE5D5),
                    facetDark = if (colors.isDark) Color(0xFF17151C) else Color(0xFFE6DAC3),
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
                NavigationItem(destination, selected = destination == current, onClick = { onSelect(destination) }, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun NavigationItem(destination: AppDestination, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = OlenaTheme.colors
    val label = stringResource(destination.label)
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Tab, onClick = onClick)
            .semantics { this.selected = selected }
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Selecionado: tile violeta com a faceta clara e a base escura, como no site; o ícone dentro
        // é o da variante escura. Os outros usam o ícone do tema.
        val iconRes = if (selected && destination != AppDestination.Profile) destination.icon(false, true) else destination.icon(selected, colors.isDark)
        val pop by animateFloatAsState(if (selected) 1f else 0.88f, tween(240), label = "nav-pop")
        Box(
            modifier = (if (selected) Modifier.size(width = 38.dp, height = 33.dp).paperTile() else Modifier.size(width = 38.dp, height = 33.dp))
                .graphicsLayer { scaleX = pop; scaleY = pop },
            contentAlignment = Alignment.Center,
        ) {
            Image(painter = painterResource(iconRes), contentDescription = null, modifier = Modifier.size(if (destination == AppDestination.Profile) 32.dp else 30.dp))
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = if (colors.isDark) Color(0xFFFFF9EF) else Color(0xFF292432),
            maxLines = 1,
            softWrap = false,
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
fun PageHeader(modifier: Modifier = Modifier, onOpenMenu: (() -> Unit)? = null) {
    val colors = OlenaTheme.colors
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(68.dp)
            .paperPanel(
                fill = if (colors.isDark) Color(0xFF292432) else colors.page,
                base = if (colors.isDark) Color(0xFF17151C) else Color(0xFFC8BAA4),
                facetLight = if (colors.isDark) Color(0xFF393244) else Color(0xFFEEE5D5),
                facetDark = if (colors.isDark) Color(0xFF17151C) else Color(0xFFE6DAC3),
                border = Color.Transparent,
                shape = RoundedCornerShape(topStart = 14.dp, topEnd = 22.dp, bottomEnd = 16.dp, bottomStart = 19.dp),
                radius = 19.dp,
                facet = 30.dp,
                shift = 5.dp,
            ),
    ) {
        if (onOpenMenu != null) MoreMenuTrigger(onClick = onOpenMenu, modifier = Modifier.align(Alignment.CenterStart).padding(start = 6.dp))
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
