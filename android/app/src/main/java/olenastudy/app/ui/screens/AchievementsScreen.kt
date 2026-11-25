package olenastudy.app.ui.screens

import android.graphics.BitmapFactory
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import olenastudy.app.R
import olenastudy.app.data.achievements.AchievementCatalog
import olenastudy.app.data.achievements.AchievementTile
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.paperDigitRes
import olenastudy.app.ui.components.paperPanel

private val SlotShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)

private enum class AchievementTab(val key: String, val icon: Int, val label: Int) {
    Math("math", R.drawable.art_conq_tab_mathematics, R.string.achievements_tab_math),
    English("english", R.drawable.art_conq_tab_english, R.string.achievements_tab_english),
    General("general", R.drawable.art_conq_tab_general, R.string.achievements_tab_general),
}

/** Galeria de Conquistas: título de papel, destaques do perfil, três abas e a grade de cartões bloqueados do site. */
@Composable
fun AchievementsScreen(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        AchievementsContent(onDismiss)
    }
}

/** Conteúdo da galeria sem a janela, para o Paparazzi. */
@Composable
fun AchievementsContent(onDismiss: () -> Unit) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val context = LocalContext.current
    val all = remember { AchievementCatalog.load(context) }
    var tabKey by rememberSaveable { mutableStateOf(AchievementTab.Math.key) }
    val tab = AchievementTab.entries.first { it.key == tabKey }
    val line = if (dark) Color(0xFF35313E) else Color(0xFFE6DDC9)
        Column(
            Modifier.fillMaxSize().background(colors.surface).statusBarsPadding().verticalScroll(rememberScrollState()).padding(horizontal = 14.dp),
        ) {
            Row(Modifier.fillMaxWidth().height(77.dp).padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(if (dark) R.drawable.art_conq_title_dark else R.drawable.art_conq_title), stringResource(R.string.profile_achievements), Modifier.size(width = 148.dp, height = 32.dp))
                Box(Modifier.weight(1f))
                Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onDismiss).semantics { contentDescription = "Fechar" }, contentAlignment = Alignment.Center) {
                    Image(painterResource(R.drawable.art_close), null, Modifier.size(28.dp))
                }
            }
            Column(
                Modifier
                    .padding(top = 12.dp)
                    .fillMaxWidth()
                    .paperPanel(
                        fill = if (dark) Color(0xFF262230) else Color(0xFFFBF2E2),
                        base = Color.Transparent,
                        facetLight = line,
                        facetDark = line,
                        border = Color.Transparent,
                        shape = RoundedCornerShape(0.dp),
                        radius = 0.dp,
                        facet = 24.dp,
                        shift = 0.dp,
                    )
                    .padding(15.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(stringResource(R.string.profile_highlights), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = colors.text)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    repeat(3) {
                        Box(
                            Modifier
                                .weight(1f)
                                .height(80.dp)
                                .paperPanel(
                                    fill = if (dark) Color(0xFF201D26) else Color.White,
                                    base = line,
                                    facetLight = Color.Transparent,
                                    facetDark = if (dark) Color(0xFF262230) else Color(0xFFEEE5D5),
                                    border = line,
                                    shape = SlotShape,
                                    radius = 13.dp,
                                    facet = 22.dp,
                                    shift = 3.dp,
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Image(painterResource(if (dark) R.drawable.art_profile_plus_dark else R.drawable.art_profile_plus), null, Modifier.size(width = 26.dp, height = 30.dp))
                        }
                    }
                }
            }
            Row(Modifier.padding(top = 22.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AchievementTab.entries.forEach { t ->
                    val selected = t == tab
                    Column(
                        Modifier
                            .size(width = 64.dp, height = 65.dp)
                            .semantics { this.selected = selected; contentDescription = context.getString(t.label) }
                            .clickable(role = Role.Tab) { tabKey = t.key },
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Image(painterResource(t.icon), null, Modifier.padding(top = 6.dp).size(48.dp))
                        Box(Modifier.padding(top = 4.dp).size(width = 64.dp, height = 4.dp).clip(RoundedCornerShape(2.dp)).background(if (selected) Color(0xFFFACC15) else Color.Transparent))
                    }
                }
            }
            Box(Modifier.padding(top = 12.dp).fillMaxWidth().height(2.dp).background(line))
            Column(Modifier.padding(top = 24.dp, bottom = 40.dp), verticalArrangement = Arrangement.spacedBy(25.dp)) {
                AchievementCatalog.byTab(all, tab.key).chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { tile -> AchievementTileView(tile, Modifier.weight(1f)) }
                        repeat(3 - row.size) { Box(Modifier.weight(1f)) }
                    }
                }
            }
        }
}

@Composable
private fun AchievementTileView(tile: AchievementTile, modifier: Modifier) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val context = LocalContext.current
    val art = remember(tile.id, dark) { context.assets.open((if (dark) "ach_dark" else "ach") + "/${tile.id}.png").use { BitmapFactory.decodeStream(it) }?.asImageBitmap() }
    val rarityColor =
        when (tile.rarity) {
            "uncommon" -> if (dark) Color(0xFFC4A4FF) else Color(0xFF6B2BC5)
            "rare" -> if (dark) Color(0xFFFFE38A) else Color(0xFF805600)
            else -> if (dark) Color(0xFF80DFE4) else Color(0xFF136B75)
        }
    Column(
        modifier.semantics(mergeDescendants = true) { contentDescription = "${tile.name} ${tile.target}. Bloqueada" },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (art != null) Image(art, null, Modifier.padding(top = 8.dp).fillMaxWidth().height(114.dp))
        Text(
            tile.name,
            fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = colors.text, textAlign = TextAlign.Center, maxLines = 2,
            modifier = Modifier.padding(top = 6.dp).heightIn(min = 31.dp),
        )
        Text(tile.rarityLabel, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.8.sp, color = rarityColor, modifier = Modifier.padding(top = 4.dp))
        Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            tile.current.forEach { Image(painterResource(paperDigitRes(it - '0', dark)), null, Modifier.size(width = 8.dp, height = 13.dp)) }
            Text(" / ", fontFamily = ManropeFamily, fontSize = 11.2.sp, color = colors.muted)
            tile.target.forEach { Image(painterResource(paperDigitRes(it - '0', dark)), null, Modifier.size(width = 8.dp, height = 13.dp)) }
        }
        if (tile.extra.isNotBlank()) {
            Text(tile.extra, fontFamily = ManropeFamily, fontSize = 11.sp, color = colors.muted, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp).width(110.dp))
        }
    }
}
