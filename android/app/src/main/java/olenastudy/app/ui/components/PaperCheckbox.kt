package olenastudy.app.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.dp
import olenastudy.app.ui.OlenaTheme

private val CheckShape = RoundedCornerShape(topStart = 4.dp, topEnd = 7.dp, bottomEnd = 4.dp, bottomStart = 6.dp)

/** Caixa de marcar do site: 22 dp, amarela com borda `#B99100` e base de 2 dp quando marcada; branca com borda clara quando não. */
@Composable
fun PaperCheckbox(checked: Boolean, modifier: Modifier = Modifier) {
    val dark = OlenaTheme.colors.isDark
    val off = if (dark) Color(0xFF423D4C) else Color(0xFFD3C7AC)
    Box(
        modifier.size(22.dp).paperPanel(
            fill = if (checked) Color(0xFFFACC15) else if (dark) Color(0xFF201D26) else Color.White,
            base = if (checked) Color(0xFFA98200) else Color.Transparent,
            facetLight = Color.Transparent,
            facetDark = Color.Transparent,
            border = if (checked) Color(0xFFB99100) else off,
            shape = CheckShape,
            radius = 6.dp,
            facet = 0.dp,
            shift = if (checked) 2.dp else 0.dp,
        ),
        contentAlignment = Alignment.Center,
    ) {
        if (checked) {
            Box(
                Modifier.size(16.dp).drawBehind {
                    val k = size.width / 24f
                    fun p(vararg xy: Float) = Path().apply { moveTo(xy[0] * k, xy[1] * k); for (i in 2 until xy.size step 2) lineTo(xy[i] * k, xy[i + 1] * k); close() }
                    drawPath(p(2f, 11f, 6f, 7f, 11f, 12f, 20f, 2f, 23f, 6f, 11f, 22f), Color(0xFF292432))
                    drawPath(p(2f, 11f, 11f, 22f, 12f, 16f, 6f, 7f), Color(0xFF51465D))
                },
            )
        }
    }
}
