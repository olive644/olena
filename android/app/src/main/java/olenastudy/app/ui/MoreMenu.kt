package olenastudy.app.ui

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.R
import olenastudy.app.ui.components.paperPanel

/** Itens do menu "Mais ferramentas", na ordem do site (MORE_ITEMS em app-navigation.tsx). */
enum class MoreMenuItem(@StringRes val label: Int, @DrawableRes val lightIcon: Int, @DrawableRes val darkIcon: Int) {
    Room(R.string.menu_room, R.drawable.art_more_room_light, R.drawable.art_more_room_dark),
    Library(R.string.nav_library, R.drawable.ic_nav_library_claro, R.drawable.ic_nav_library_escuro),
    Notes(R.string.menu_notes, R.drawable.art_more_notes_light, R.drawable.art_more_notes_dark),
}

private val ItemShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val EdgeShape = RoundedCornerShape(topStart = 18.dp, topEnd = 0.dp, bottomEnd = 0.dp, bottomStart = 18.dp)
private val Cream = Color(0xFFFFF9EF)

/**
 * Botão de menu (hambúrguer, `.mobile-more-trigger`): caixa de toque de 48 dp com três barras de
 * 24 x 4, cantos recortados e sombra lavanda de 1 dp. Barras escuras no tema claro, creme no escuro.
 */
@Composable
fun MoreMenuTrigger(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val bar = if (OlenaTheme.colors.isDark) Cream else Color(0xFF292432)
    val description = stringResource(R.string.menu_more)
    Canvas(
        modifier
            .size(48.dp)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
    ) {
        for (index in 0 until 3) {
            val top = (14 + index * 8).dp.toPx()
            val left = 12.dp.toPx()
            fun barPath(dx: Float, dy: Float) = Path().apply {
                addRoundRect(
                    RoundRect(
                        left + dx, top + dy, left + dx + 24.dp.toPx(), top + dy + 4.dp.toPx(),
                        topLeftCornerRadius = CornerRadius(1.dp.toPx()), topRightCornerRadius = CornerRadius(3.dp.toPx()),
                        bottomRightCornerRadius = CornerRadius(1.dp.toPx()), bottomLeftCornerRadius = CornerRadius(2.dp.toPx()),
                    ),
                )
            }
            drawPath(barPath(1.dp.toPx(), 1.dp.toPx()), Color(0xFFA779EF))
            drawPath(barPath(0f, 0f), bar)
        }
    }
}

/** Painel lateral (`.mobile-more-sheet`) sobre um véu: fecha pelo véu, pela aba ‹ ou pelo botão voltar. */
@Composable
fun MoreMenuSheet(onSelect: (MoreMenuItem) -> Unit, onClose: () -> Unit, modifier: Modifier = Modifier) {
    val scrimLabel = stringResource(R.string.menu_close_more)
    Box(modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color(0xFF17151C).copy(alpha = 0.42f))
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, role = Role.Button, onClick = onClose)
                .semantics { contentDescription = scrimLabel },
        )
        MoreMenuContent(onSelect, onClose, Modifier.align(Alignment.CenterStart))
    }
}

/** Painel sem o véu, para a captura de tela do Paparazzi. */
@Composable
fun MoreMenuContent(onSelect: (MoreMenuItem) -> Unit, onClose: () -> Unit, modifier: Modifier = Modifier) {
    val dark = OlenaTheme.colors.isDark
    val closeLabel = stringResource(R.string.menu_close)
    Box(
        modifier
            .fillMaxHeight()
            .fillMaxWidth(0.86f)
            .drawBehind {
                val r = 24.dp.toPx()
                val shape = Path().apply {
                    addRoundRect(RoundRect(0f, 0f, size.width, size.height, topLeftCornerRadius = CornerRadius.Zero, topRightCornerRadius = CornerRadius(r), bottomRightCornerRadius = CornerRadius(r), bottomLeftCornerRadius = CornerRadius.Zero))
                }
                translate(left = 14.dp.toPx()) { drawPath(shape, Color(0x29292432)) }
                drawPath(shape, Color(0xFF211C29))
                clipPath(shape) {
                    val first = 94.3.dp.toPx()
                    val last = 82.5.dp.toPx()
                    drawPath(Path().apply { moveTo(0f, 0f); lineTo(first, 0f); lineTo(0f, first); close() }, Color(0xFF30283D))
                    drawPath(Path().apply { moveTo(size.width, size.height); lineTo(size.width - last, size.height); lineTo(size.width, size.height - last); close() }, Color(0xFF17151C))
                }
                drawPath(shape, Color(0xFF4B209B), style = Stroke(1.dp.toPx()))
            },
    ) {
        Column(Modifier.padding(start = 17.dp, end = 17.dp, top = 83.dp, bottom = 24.dp)) {
            Spacer(Modifier.height(6.dp))
            Text(
                buildAnnotatedString {
                    append(stringResource(R.string.share_brand).take(5).uppercase())
                    withStyle(SpanStyle(color = Color(0xFFA685FA))) { append(stringResource(R.string.share_brand).drop(5).uppercase()) }
                },
                fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 9.92.sp, letterSpacing = 0.7936.sp, color = Cream,
            )
            Spacer(Modifier.height(4.4.dp))
            Text(stringResource(R.string.menu_more), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 20.sp, letterSpacing = (-0.7).sp, lineHeight = 27.sp, color = Cream)
            Spacer(Modifier.height(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.4.dp)) {
                MoreMenuItem.entries.chunked(2).forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.4.dp)) {
                        pair.forEach { item -> MoreItem(item, dark, { onSelect(item) }, Modifier.weight(1f)) }
                        if (pair.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
        Box(
            Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 1.dp)
                .size(width = 44.dp, height = 70.dp)
                .paperPanel(fill = Cream, base = Color(0xFFC8BAA4), facetLight = Color.Transparent, facetDark = Color.Transparent, border = Color(0xFFD7CBB7), shape = EdgeShape, radius = 18.dp, facet = 0.dp, shift = 5.dp)
                .clickable(role = Role.Button, onClick = onClose)
                .semantics { contentDescription = closeLabel },
            contentAlignment = Alignment.Center,
        ) {
            Text("‹", fontFamily = ManropeFamily, fontSize = 35.2.sp, color = Color(0xFF292432))
        }
    }
}

@Composable
private fun MoreItem(item: MoreMenuItem, dark: Boolean, onClick: () -> Unit, modifier: Modifier) {
    Row(
        modifier
            .paperPanel(
                fill = Color(0xFF7132E8), base = Color(0xFF42158F), facetLight = Color(0xFF8F55F4), facetDark = Color(0xFF5520B4),
                border = Color(0xFF9B75F3), shape = ItemShape, radius = 13.dp, facet = 27.dp, shift = 5.dp,
            )
            .clickable(role = Role.Button, onClick = onClick)
            .padding(start = 13.8.dp, end = 12.8.dp, top = 11.2.dp, bottom = 11.2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.4.dp),
    ) {
        Box(
            Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(if (dark) Color(0xFF17151C) else Cream)
                .border(1.dp, if (dark) Color(0xFF51465D) else Cream.copy(alpha = 0.4f), RoundedCornerShape(9.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Image(painterResource(if (dark) item.darkIcon else item.lightIcon), null, Modifier.size(20.dp))
        }
        Text(stringResource(item.label), fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.16.sp, color = Cream, maxLines = 1)
    }
}
