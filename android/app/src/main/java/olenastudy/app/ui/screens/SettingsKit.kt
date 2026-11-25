package olenastudy.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.paperPanel

/** Peças das telas de Configurações "Estudo e foco" e "Cadernos", com as medidas do site (1 px = 1 dp). */
internal val StButtonShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val StCardShape = RoundedCornerShape(topStart = 8.dp, topEnd = 24.dp, bottomEnd = 8.dp, bottomStart = 14.dp)

internal val StLine @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF35313E) else Color(0xFFE6DDC9)
internal val StSurface @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF201D26) else Color.White

/** Cartão branco da seção: borda de 1, base de 5, cantos 8/24/8/14 e margem interna de 20. */
@Composable
internal fun StCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val line = StLine
    Column(
        modifier
            .fillMaxWidth()
            .paperPanel(
                fill = StSurface,
                base = line,
                facetLight = Color.Transparent,
                facetDark = Color.Transparent,
                border = line,
                shape = StCardShape,
                radius = 14.dp,
                facet = 0.dp,
                shift = 5.dp,
            )
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) { content() }
}

@Composable
internal fun StEyebrow(text: String) {
    Text(
        text.uppercase(), fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 10.56.sp, letterSpacing = 0.95.sp,
        color = if (OlenaTheme.colors.isDark) Color(0xFF8B5CF6) else Color(0xFF6D28D9),
    )
}

@Composable
internal fun StTitle(text: String) {
    Text(text, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 18.4.sp, color = OlenaTheme.colors.text)
}

/** Rótulo de grupo em caixa alta (legend do site). */
@Composable
internal fun StLegend(text: String) {
    Text(
        text.uppercase(), fontFamily = ManropeFamily, fontWeight = FontWeight(850), fontSize = 11.52.sp, letterSpacing = 0.69.sp,
        color = OlenaTheme.colors.muted,
    )
}

@Composable
internal fun StBody(text: String, size: Float = 16f, muted: Boolean = true) {
    Text(text, fontFamily = ManropeFamily, fontSize = size.sp, color = if (muted) OlenaTheme.colors.muted else OlenaTheme.colors.text)
}

/** Botão de escolha: branco com base, ou amarelo com o visto quando selecionado. */
@Composable
internal fun StChoice(text: String, selected: Boolean, modifier: Modifier = Modifier, sub: String? = null, onClick: () -> Unit) {
    val line = StLine
    Box(
        modifier
            .heightIn(min = 52.dp)
            .semantics { this.selected = selected }
            .paperPanel(
                fill = if (selected) Color(0xFFFACC15) else StSurface,
                base = if (selected) Color(0xFFB88C13) else line,
                facetLight = if (selected) Color(0xFFFFE066) else if (OlenaTheme.colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2),
                facetDark = Color.Transparent,
                border = if (selected) Color(0xFFE4BD35) else line,
                shape = StButtonShape,
                radius = 13.dp,
                facet = 14.dp,
                shift = 4.dp,
            )
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 13.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) {
            if (selected) StCheck()
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, textAlign = TextAlign.Center,
                    color = if (selected) Color(0xFF292432) else OlenaTheme.colors.text,
                )
                if (sub != null) Text(sub, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 13.33.sp, color = Color(0xFF51465D))
            }
        }
    }
}

/** Visto de papel do site (PaperCheckIcon), em 18 dp. */
@Composable
internal fun StCheck() {
    Box(
        Modifier.size(18.dp).drawBehind {
            val k = size.width / 24f
            fun p(vararg xy: Float) = Path().apply { moveTo(xy[0] * k, xy[1] * k); for (i in 2 until xy.size step 2) lineTo(xy[i] * k, xy[i + 1] * k); close() }
            drawPath(p(2f, 11f, 6f, 7f, 11f, 12f, 20f, 2f, 23f, 6f, 11f, 22f), Color(0xFF292432))
            drawPath(p(2f, 11f, 11f, 22f, 12f, 16f, 6f, 7f), Color(0xFF51465D))
        },
    )
}

/** Duas colunas de botões com 12 dp entre eles, como a grade de escolhas do site. */
@Composable
internal fun StGrid(items: List<@Composable (Modifier) -> Unit>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { it(Modifier.weight(1f)) }
                if (row.size == 1) Box(Modifier.weight(1f))
            }
        }
    }
}

/** Botão secundário pequeno (Usar duração, Zerar contadores). */
@Composable
internal fun StButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val line = StLine
    Box(
        modifier
            .heightIn(min = 44.dp)
            .paperPanel(StSurface, line, if (OlenaTheme.colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2), Color.Transparent, line, StButtonShape, 13.dp, 14.dp, 4.dp)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.16.sp, color = OlenaTheme.colors.text, textAlign = TextAlign.Center)
    }
}

internal fun Modifier.stPress(): Modifier = this.graphicsLayer { }
