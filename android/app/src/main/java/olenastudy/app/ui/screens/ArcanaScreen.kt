package olenastudy.app.ui.screens

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.layout.statusBarsPadding
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
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
import olenastudy.app.data.arcana.ArcanaCard
import olenastudy.app.data.arcana.ArcanaCatalog
import olenastudy.app.data.arcana.ArcanaCategory
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.paperPanel

private val DialogShape = RoundedCornerShape(topStart = 5.dp, topEnd = 24.dp, bottomEnd = 6.dp, bottomStart = 18.dp)
private val TabShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val TabYellow = Color(0xFFFACC15)
private val TabYellowShade = Color(0xFFB28B0B)

private fun ArcanaCategory.icon(): Int =
    when (this) {
        ArcanaCategory.All -> R.drawable.art_arcana_cat_all
        ArcanaCategory.Major -> R.drawable.art_arcana_cat_major
        ArcanaCategory.Minor -> R.drawable.art_arcana_cat_minor
        ArcanaCategory.Wands -> R.drawable.art_arcana_cat_wands
        ArcanaCategory.Cups -> R.drawable.art_arcana_cat_cups
        ArcanaCategory.Swords -> R.drawable.art_arcana_cat_swords
        ArcanaCategory.Pentacles -> R.drawable.art_arcana_cat_pentacles
    }

private fun ArcanaCategory.label(): Int =
    when (this) {
        ArcanaCategory.All -> R.string.arcana_tab_all
        ArcanaCategory.Major -> R.string.arcana_tab_major
        ArcanaCategory.Minor -> R.string.arcana_tab_minor
        ArcanaCategory.Wands -> R.string.arcana_tab_wands
        ArcanaCategory.Cups -> R.string.arcana_tab_cups
        ArcanaCategory.Swords -> R.string.arcana_tab_swords
        ArcanaCategory.Pentacles -> R.string.arcana_tab_pentacles
    }

private fun rarityIcon(rarity: Int): Int =
    when (rarity) {
        3 -> R.drawable.art_arcana_rarity_3
        2 -> R.drawable.art_arcana_rarity_2
        else -> R.drawable.art_arcana_rarity_0
    }

/** Largura do selo no site (Comum 82, Épica 68, Lendária 86 px de CSS). */
private fun rarityWidth(rarity: Int) = when (rarity) { 3 -> 86.dp; 2 -> 68.dp; else -> 82.dp }

/** Galeria de Arcano em diálogo de tela cheia, aberta pela seta do título "Arcano" no Perfil. */
@Composable
fun ArcanaScreen(onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        ArcanaContent(onDismiss)
    }
}

/**
 * Conteúdo da galeria sem o `Dialog` (para testes de imagem). Como no site, o cabeçalho com o título e os
 * destaques do perfil fica fixo e o restante (abas, ajuda e a grade de 78 cartas) rola por baixo dele.
 */
@Composable
fun ArcanaContent(onDismiss: () -> Unit, scroll: ScrollState = rememberScrollState()) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val context = LocalContext.current
    val all = remember { ArcanaCatalog.load(context) }
    var categoryKey by rememberSaveable { mutableStateOf(ArcanaCategory.All.key) }
    val category = ArcanaCategory.entries.first { it.key == categoryKey }
    val line = if (dark) Color(0xFF35313E) else Color(0xFFE6DDC9)
    val cream = if (dark) Color(0xFF262230) else Color(0xFFFBF2E2)
    Box(Modifier.fillMaxSize().clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onDismiss).statusBarsPadding().navigationBarsPadding().padding(horizontal = 19.dp, vertical = 16.dp)) {
        Column(
            Modifier
                .fillMaxSize()
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {}
                .paperPanel(
                    fill = colors.surface,
                    base = cream,
                    facetLight = Color.Transparent,
                    facetDark = Color.Transparent,
                    border = line,
                    shape = DialogShape,
                    radius = 24.dp,
                    facet = 0.dp,
                    shift = 9.dp,
                ),
        ) {
            Column(Modifier.fillMaxWidth().background(colors.surface).padding(start = 17.dp, end = 17.dp, top = 9.dp, bottom = 8.dp)) {
                Row(Modifier.fillMaxWidth().height(44.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.profile_arcana), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 18.4.sp, lineHeight = 26.sp, color = colors.text)
                    Box(Modifier.weight(1f))
                    Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onDismiss).semantics { contentDescription = "Fechar" }, contentAlignment = Alignment.Center) {
                        Image(painterResource(R.drawable.art_close), null, Modifier.size(28.dp))
                    }
                }
                Highlights(Modifier.padding(top = 8.dp), cream = cream, line = line)
            }
            Column(Modifier.weight(1f).verticalScroll(scroll).padding(start = 17.dp, end = 17.dp, top = 18.dp, bottom = 24.dp)) {
                Tabs(category, line, cream) { categoryKey = it.key }
                Text(
                    stringResource(R.string.arcana_help),
                    fontFamily = ManropeFamily, fontSize = 12.48.sp, lineHeight = 18.72.sp, letterSpacing = (-0.4).sp, color = colors.muted,
                    modifier = Modifier.padding(top = 26.dp, bottom = 12.48.dp),
                )
                Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    ArcanaCatalog.filter(all, category).chunked(3).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            row.forEach { card -> CardTile(card, Modifier.weight(1f)) }
                            repeat(3 - row.size) { Box(Modifier.weight(1f)) }
                        }
                    }
                }
            }
        }
    }
}

/** Painel "Destaques do perfil": canto superior esquerdo e inferior direito cortados, base 4 dp abaixo. */
@Composable
private fun Highlights(modifier: Modifier, cream: Color, line: Color) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    Column(
        modifier
            .fillMaxWidth()
            .drawBehind {
                val c = 16.dp.toPx()
                val base = 4.dp.toPx()
                fun poly(dy: Float) = Path().apply {
                    moveTo(c, dy); lineTo(size.width, dy); lineTo(size.width, size.height - c + dy)
                    lineTo(size.width - c, size.height + dy); lineTo(0f, size.height + dy); lineTo(0f, c + dy); close()
                }
                drawPath(poly(base), line)
                drawPath(poly(0f), cream)
            }
            .padding(start = 6.dp, end = 6.dp, top = 12.dp, bottom = 16.dp),
    ) {
        Text(stringResource(R.string.profile_highlights), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 22.sp, color = colors.text)
        Row(Modifier.padding(top = 8.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(11.7.dp)) {
            repeat(3) {
                Column(Modifier.weight(1f).height(154.3.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Image(painterResource(if (dark) R.drawable.art_arcana_slot_dark else R.drawable.art_arcana_slot), null, Modifier.padding(top = 4.dp).size(width = 70.dp, height = 120.3.dp))
                    Text(stringResource(R.string.arcana_favorite), fontFamily = ManropeFamily, fontWeight = FontWeight.Medium, fontSize = 11.52.sp, lineHeight = 15.sp, color = colors.text, modifier = Modifier.padding(top = 8.dp))
                }
            }
        }
    }
}

@Composable
private fun Tabs(selected: ArcanaCategory, line: Color, cream: Color, onSelect: (ArcanaCategory) -> Unit) {
    val colors = OlenaTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        ArcanaCategory.entries.chunked(5).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                row.forEach { c ->
                    val on = c == selected
                    val label = stringResource(c.label())
                    Box(
                        Modifier
                            .size(56.dp)
                            .semantics { this.selected = on; contentDescription = label }
                            .clickable(role = Role.Tab) { onSelect(c) }
                            .paperPanel(
                                fill = if (on) TabYellow else colors.surface,
                                base = if (on) TabYellowShade else line,
                                facetLight = if (on) Color.Transparent else cream,
                                facetDark = if (on) Color.Transparent else line,
                                border = Color.Transparent,
                                shape = TabShape,
                                radius = 13.dp,
                                facet = 9.5.dp,
                                shift = 4.dp,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Image(painterResource(c.icon()), null, Modifier.size(width = 32.dp, height = 34.dp))
                    }
                }
            }
        }
    }
}

private val Desaturate = ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0.3f) })

/** Carta ainda não obtida: a arte sai esmaecida (saturação 0,3 e opacidade 0,45), como no site. */
@Composable
private fun CardTile(card: ArcanaCard, modifier: Modifier) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val context = LocalContext.current
    val art = remember(card.id, dark) { context.assets.open(ArcanaCatalog.artPath(card.id, dark)).use { BitmapFactory.decodeStream(it) }?.asImageBitmap() }
    Column(
        // Altura medida no site: 231,5 px com o nome em uma linha, mais 15 px por linha extra.
        modifier.height((231.5f + (card.nameLines - 1) * 15f).dp).semantics(mergeDescendants = true) { contentDescription = "${card.name}. ${card.rarityLabel}. Ainda não obtida" },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.fillMaxWidth().padding(4.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            // A arte inclui a sombra roxa de 1 x 3 px da carta (95 x 164,5), que invade o espaço antes do nome.
            Box(Modifier.size(width = 94.dp, height = 161.5.dp).wrapContentSize(Alignment.TopStart, unbounded = true)) {
                if (art != null) Image(art, null, Modifier.size(width = 95.dp, height = 164.5.dp), contentScale = ContentScale.FillBounds, alpha = 0.45f, colorFilter = Desaturate)
            }
            Text(
                card.name,
                fontFamily = ManropeFamily, fontWeight = FontWeight.Medium, fontSize = 11.52.sp, lineHeight = 15.sp, color = colors.text, textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        Image(painterResource(rarityIcon(card.rarity)), card.rarityLabel, Modifier.size(width = rarityWidth(card.rarity), height = 24.dp), contentScale = ContentScale.FillBounds)
        Text(stringResource(R.string.arcana_not_owned), fontFamily = ManropeFamily, fontSize = 11.2.sp, lineHeight = 15.sp, color = colors.muted, textAlign = TextAlign.Center)
    }
}
