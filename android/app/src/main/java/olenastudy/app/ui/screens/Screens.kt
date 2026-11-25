package olenastudy.app.ui.screens

import androidx.annotation.StringRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import olenastudy.app.ui.components.paperPanel
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.R
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.PaperCard
import olenastudy.app.ui.navigation.AppDestination

/** Base de toda tela simples: rolagem, margem e título em Manrope. */
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

/**
 * Perfil igual ao do site para quem ainda não entrou na conta: capa, avatar com o nível, barra de
 * experiência, Conquistas e Arcano vazios. Os botões de amigos dependem da conta e aparecem
 * esmaecidos, sem ação. A aparência do app fica no fim, no lugar da engrenagem do site.
 */
@Composable
fun ProfileScreen(themeMode: ThemeMode, onThemeModeChange: (ThemeMode) -> Unit) {
    val colors = OlenaTheme.colors
    var settingsOpen by rememberSaveable { mutableStateOf(false) }
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(Modifier.fillMaxWidth()) {
            Image(
                painterResource(R.drawable.ic_profile_cover),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().height(168.dp),
            )
            PaperTile(
                onClick = { settingsOpen = true },
                description = stringResource(R.string.profile_settings),
                modifier = Modifier.align(Alignment.TopEnd).padding(top = 12.dp, end = 14.dp).size(width = 58.dp, height = 47.dp),
            ) { Image(painterResource(R.drawable.art_icon_settings), null, Modifier.size(30.dp)) }
            Image(painterResource(R.drawable.art_icon_pen), null, Modifier.align(Alignment.TopEnd).padding(top = 118.dp, end = 14.dp).size(30.dp))
            Image(
                painterResource(R.drawable.art_avatar_helena),
                contentDescription = stringResource(R.string.profile_avatar_description),
                modifier = Modifier.padding(start = 16.dp, top = 112.dp).size(112.dp),
            )
            LevelBadge(Modifier.padding(start = 92.dp, top = 188.dp))
        }
        Column(Modifier.padding(horizontal = 16.dp).padding(top = 38.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(R.string.profile_title), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 30.sp, color = colors.text)
                Image(painterResource(R.drawable.art_icon_pen), null, Modifier.size(26.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Image(painterResource(R.drawable.ic_nav_profile_active), null, Modifier.padding(end = 8.dp).size(22.dp))
                Text(stringResource(R.string.profile_level), style = MaterialTheme.typography.titleMedium, color = colors.text, modifier = Modifier.weight(1f))
                Text(stringResource(R.string.profile_xp), style = MaterialTheme.typography.bodyMedium, color = colors.muted)
            }
            Box(Modifier.fillMaxWidth().height(10.dp).background(colors.line, RoundedCornerShape(6.dp)))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PaperTile(onClick = {}, description = stringResource(R.string.profile_add_friend), modifier = Modifier.height(44.dp)) {
                    Row(Modifier.padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Image(painterResource(R.drawable.ic_profile_friend), null, Modifier.size(26.dp))
                        Text(stringResource(R.string.profile_add_friend), fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color(0xFF292432), maxLines = 1)
                    }
                }
                PaperTile(onClick = {}, description = stringResource(R.string.profile_qr), modifier = Modifier.size(width = 44.dp, height = 44.dp)) {
                    Image(painterResource(R.drawable.art_icon_qr), null, Modifier.size(26.dp))
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SocialChip(R.drawable.ic_profile_followers, stringResource(R.string.profile_followers))
                SocialChip(R.drawable.ic_profile_following, stringResource(R.string.profile_following))
            }
            Text(stringResource(R.string.profile_social_needs_account), style = MaterialTheme.typography.bodyMedium, color = colors.muted)
        }
        Box(Modifier.fillMaxWidth().height(2.dp).background(colors.line))
        Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            ShowcaseHeader(stringResource(R.string.profile_achievements), "0 / 187")
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                repeat(3) { EmptySlot(Modifier.weight(1f).aspectRatio(0.95f)) }
            }
            ShowcaseHeader(stringResource(R.string.profile_arcana), "0 / 78")
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                repeat(3) {
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        EmptySlot(Modifier.fillMaxWidth().aspectRatio(0.72f))
                        Text(stringResource(R.string.profile_favorite), style = MaterialTheme.typography.bodyMedium, color = colors.muted)
                    }
                }
            }
        }
        Box(Modifier.height(12.dp))
    }
    if (settingsOpen) {
        AlertDialog(
            onDismissRequest = { settingsOpen = false },
            title = { Text(stringResource(R.string.profile_appearance_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.profile_appearance_hint), style = MaterialTheme.typography.bodyMedium, color = colors.muted)
                    ThemeChoice(R.string.theme_system, ThemeMode.System, themeMode, onThemeModeChange)
                    ThemeChoice(R.string.theme_light, ThemeMode.Light, themeMode, onThemeModeChange)
                    ThemeChoice(R.string.theme_dark, ThemeMode.Dark, themeMode, onThemeModeChange)
                }
            },
            confirmButton = { PaperButton(stringResource(R.string.agenda_cancel), { settingsOpen = false }, style = PaperButtonStyle.Quiet) },
        )
    }
}

@Composable
private fun LevelBadge(modifier: Modifier) {
    Box(
        modifier = modifier
            .size(width = 58.dp, height = 62.dp)
            .drawBehind {
                val w = size.width
                val h = size.height
                drawPath(
                    Path().apply { moveTo(0f, 0f); lineTo(w, 0f); lineTo(w, h * 0.72f); lineTo(w / 2, h); lineTo(0f, h * 0.72f); close() },
                    Color(0xFFFACC15),
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text("NV", fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = Color(0xFF292432))
            Text("1", fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp, color = Color(0xFF292432))
        }
    }
}

/** Peça de papel clara e em relevo (botão secundário do site): fundo branco, base e faceta no canto. */
@Composable
private fun PaperTile(onClick: () -> Unit, description: String, modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    Box(
        modifier = modifier
            .semantics { contentDescription = description }
            .paperPanel(
                fill = if (dark) Color(0xFFFFF9EF) else Color.White,
                base = if (dark) Color(0xFFC8BAA4) else Color(0xFFD7CBB7),
                facetLight = Color(0xFFF1E9DC),
                facetDark = Color(0xFFE6DAC3),
                border = Color.Transparent,
                shape = RoundedCornerShape(topStart = 8.dp, topEnd = 16.dp, bottomEnd = 10.dp, bottomStart = 13.dp),
                radius = 13.dp,
                facet = 18.dp,
                shift = 4.dp,
            )
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content,
    )
}

@Composable
private fun SocialChip(icon: Int, label: String) {
    val colors = OlenaTheme.colors
    Row(
        Modifier.height(44.dp).clip(RoundedCornerShape(12.dp)).background(colors.soft).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Image(painterResource(icon), null, Modifier.size(26.dp))
        Text(label, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = colors.text, maxLines = 1)
    }
}

@Composable
private fun ShowcaseHeader(title: String, count: String) {
    val colors = OlenaTheme.colors
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(title, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = colors.text)
        Text(count, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = colors.muted, modifier = Modifier.weight(1f))
        Image(painterResource(R.drawable.ic_paper_arrow), null, Modifier.size(30.dp), alpha = 0.55f)
    }
}

/** Vaga vazia de destaque: borda tracejada e um "+", como no site. */
@Composable
private fun EmptySlot(modifier: Modifier) {
    val colors = OlenaTheme.colors
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(colors.soft)
            .drawBehind {
                drawRoundRect(
                    color = colors.lineStrong,
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(14.dp.toPx()),
                    style = Stroke(width = 1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f))),
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        Text("+", fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 34.sp, color = colors.text.copy(alpha = 0.75f))
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
