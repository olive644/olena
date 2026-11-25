package olenastudy.app.ui

import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import olenastudy.app.ui.screens.avatarArt
import androidx.compose.foundation.shape.CircleShape
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
        if (destination == current) {
            if (entry?.destination?.route != destination.route) {
                navController.popBackStack(destination.route, inclusive = false)
            }
            return
        }
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
            if (current != AppDestination.Profile) PageHeader(Modifier.padding(start = 14.4.dp, end = 14.4.dp, bottom = 16.dp))
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
                                ProfileScreen(themeMode = themeMode, onThemeModeChange = onThemeModeChange, look = look, onLookChange = onLookChange, info = info, onInfoChange = onInfoChange, onOpenSettings = { navController.navigate(AppDestination.SETTINGS_ROUTE) { launchSingleTop = true } })
                            AppDestination.Today -> HomeScreen(summary, onExploreMath = { onNavigate(AppDestination.Learn) })
                            AppDestination.Learn -> PracticeScreen()
                            AppDestination.Focus -> FocusScreen(focusController)
                            AppDestination.Planner -> AgendaScreen(agendaRepository, taskRepository)
                            else -> InProgressScreen(destination.titleRes())
                        }
                    }
                }
                composable(AppDestination.SETTINGS_ROUTE) {
                    androidx.compose.runtime.CompositionLocalProvider(olenastudy.app.ui.screens.LocalFocusController provides focusController) {
                        SettingsScreen(themeMode = themeMode, onThemeModeChange = onThemeModeChange, onBack = { navController.popBackStack() })
                    }
                }
            }
        }
        }
        PaperNavigationBar(
            avatarId = look.avatarId,
            current = current,
            onSelect = ::onNavigate,
        )
    }
    }
}

/**
 * Barra de navegação de papel, com as medidas do site no celular: 18,8 de margem em cada lado, 63 de altura,
 * cantos 14/22/16/19, borda de 1, base de 7 (claro) ou 4 (escuro) e itens de 51 de altura.
 */
@Composable
fun PaperNavigationBar(current: AppDestination, onSelect: (AppDestination) -> Unit, avatarId: String = "helena") {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val description = stringResource(R.string.nav_bar_description)
    Box(modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 18.8.dp, end = 18.8.dp, top = 10.dp, bottom = 14.8.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(63.dp)
                .paperPanel(
                    fill = if (dark) Color(0xFF292432) else Color(0xFFFFF9EF),
                    base = if (dark) Color(0xFF17151C) else Color(0xFFC8BAA4),
                    facetLight = if (dark) Color(0xFF393244) else Color(0xFFEEE5D5),
                    facetDark = if (dark) Color(0xFF17151C) else Color(0xFFE9DDC6),
                    border = if (dark) Color(0xFF51465D) else Color(0xFFD7CBB7),
                    shape = RoundedCornerShape(topStart = 14.dp, topEnd = 22.dp, bottomEnd = 16.dp, bottomStart = 19.dp),
                    radius = 19.dp,
                    facet = 26.dp,
                    shift = if (dark) 4.dp else 7.dp,
                )
                .semantics { contentDescription = description }
                .padding(start = 7.dp, end = 7.dp, top = 5.dp, bottom = 7.dp),
        ) {
            AppDestination.entries.forEach { destination ->
                NavigationItem(destination, selected = destination == current, avatarId = avatarId, onClick = { onSelect(destination) }, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun NavigationItem(destination: AppDestination, selected: Boolean, avatarId: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = OlenaTheme.colors
    val label = stringResource(destination.label)
    Column(
        modifier = modifier
            .height(51.dp)
            .clip(ItemShape)
            .clickable(role = Role.Tab, onClick = onClick)
            .semantics { this.selected = selected },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // O destino ativo vira um tile violeta 2 dp mais alto, com o ícone da variante escura, como no site.
        // O Perfil mostra o avatar escolhido em um círculo de 24 dp.
        val iconRes = if (selected) destination.icon(false, true) else destination.icon(false, colors.isDark)
        val pop by animateFloatAsState(if (selected) 1f else 0.9f, tween(240), label = "nav-pop")
        val lift by animateFloatAsState(if (selected) -2f else 0f, tween(240), label = "nav-lift")
        Box(
            modifier = Modifier
                .padding(top = 4.dp)
                .size(width = 34.dp, height = 30.dp)
                .graphicsLayer { scaleX = pop; scaleY = pop; translationY = lift * density }
                .then(if (selected) Modifier.paperTile() else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            if (destination == AppDestination.Profile) {
                Image(painter = painterResource(avatarArt(avatarId)), contentDescription = null, modifier = Modifier.size(24.dp).clip(CircleShape))
            } else {
                Image(painter = painterResource(iconRes), contentDescription = null, modifier = Modifier.size(width = 32.dp, height = 28.dp))
            }
        }
        Text(
            text = label,
            fontSize = 8.8.sp,
            lineHeight = 12.sp,
            fontWeight = FontWeight(720),
            fontFamily = ManropeFamily,
            color = if (colors.isDark) Color(0xFFFFF9EF) else Color(0xFF292432),
            maxLines = 1,
            softWrap = false,
            modifier = Modifier.padding(top = 1.dp),
        )
    }
}

private val ItemShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val TileShape = RoundedCornerShape(topStart = 7.dp, topEnd = 13.dp, bottomEnd = 8.dp, bottomStart = 11.dp)

/** Tile violeta do destino ativo: faceta clara no canto, canto escuro e base deslocada. */
private fun Modifier.paperTile(): Modifier =
    this.paperPanel(
        fill = Color(0xFF7433E0),
        base = Color(0xFF4B209B),
        facetLight = Color(0xFF8A4CE5),
        facetDark = Color(0xFF5C28B5),
        border = Color(0xFF7433E0),
        shape = TileShape,
        radius = 11.dp,
        facet = 11.dp,
        shift = 4.dp,
    )

/**
 * Cabeçalho de papel de todas as telas, colado no topo: cantos de baixo 18 e 12, borda de 1 e base de 4.
 * O sino de atualizações é um botão de papel de 58 x 44 com o ícone de 25 x 24.
 */
@Composable
fun PageHeader(modifier: Modifier = Modifier) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(68.dp)
            .paperPanel(
                fill = if (dark) Color(0xFF292432) else Color(0xFFFFF9EF),
                base = if (dark) Color(0xFF17151C) else Color(0xFFC8BAA4),
                facetLight = if (dark) Color(0xFF393244) else Color(0xFFEEE5D5),
                facetDark = if (dark) Color(0xFF17151C) else Color(0xFFE9DDC6),
                border = if (dark) Color(0xFF51465D) else Color(0xFFD7CBB7),
                shape = RoundedCornerShape(topStart = 0.dp, topEnd = 0.dp, bottomEnd = 18.dp, bottomStart = 12.dp),
                radius = 18.dp,
                facet = 30.dp,
                shift = 4.dp,
            ),
    ) {
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 11.dp, end = 13.dp)
                .size(width = 58.dp, height = 44.dp)
                .semantics { contentDescription = "Atualizações do sistema, 0 não lidas" }
                .paperPanel(
                    fill = Color(0xFFFFF9EF),
                    base = Color(0xFFC8BAA4),
                    facetLight = Color(0xFFE9DDC6),
                    facetDark = Color.Transparent,
                    border = Color(0xFFD7CBB7),
                    shape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp),
                    radius = 13.dp,
                    facet = 16.dp,
                    shift = 3.dp,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Image(painterResource(R.drawable.art_bell_icon), null, Modifier.size(width = 25.dp, height = 24.dp))
        }
    }
}
