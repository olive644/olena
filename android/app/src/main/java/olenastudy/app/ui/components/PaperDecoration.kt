package olenastudy.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import olenastudy.app.ui.OlenaTheme

/**
 * Fundo decorativo do site: estrelas de papel espalhadas e, no tema escuro, uma lua. No site isto é
 * pintado por CSS; aqui é uma aproximação com posições fixas (frações da tela), não uma cópia pixel a pixel.
 */
@Composable
fun PaperDecoration(modifier: Modifier = Modifier) {
    val dark = OlenaTheme.colors.isDark
    val tone = if (dark) Color(0xFF26222F) else Color(0xFFF1E6CE)
    Canvas(modifier.fillMaxSize()) {
        star(Offset(size.width * 0.16f, size.height * 0.13f), 30.dp.toPx(), tone)
        star(Offset(size.width * 0.10f, size.height * 0.46f), 17.dp.toPx(), tone)
        star(Offset(size.width * 0.85f, size.height * 0.60f), 22.dp.toPx(), tone)
        star(Offset(size.width * 0.70f, size.height * 0.30f), 13.dp.toPx(), tone)
        if (dark) moon(Offset(size.width * 0.86f, size.height * 0.22f), 38.dp.toPx(), tone)
    }
}

private fun DrawScope.star(center: Offset, outer: Float, color: Color) {
    val path = Path()
    for (i in 0 until 16) {
        val radius = if (i % 2 == 0) outer else outer * 0.55f
        val angle = -PI / 2 + i * PI / 8
        val x = center.x + (radius * cos(angle)).toFloat()
        val y = center.y + (radius * sin(angle)).toFloat()
        if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
    }
    path.close()
    drawPath(path, color)
}

private fun DrawScope.moon(center: Offset, radius: Float, color: Color) {
    val disc = Path().apply { addOval(androidx.compose.ui.geometry.Rect(center, radius)) }
    val bite = Path().apply { addOval(androidx.compose.ui.geometry.Rect(Offset(center.x + radius * 0.45f, center.y - radius * 0.15f), radius * 0.95f)) }
    drawPath(Path.combine(PathOperation.Difference, disc, bite), color)
}
