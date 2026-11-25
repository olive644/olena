package olenastudy.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.dp
import olenastudy.app.ui.OlenaTheme

private val CardShape = RoundedCornerShape(20.dp)

/**
 * Cartão de papel: fundo `surface`, borda `line` e uma base deslocada para baixo, como as cartas
 * do site ("base deslocada"). Não é moldura de foco: a borda aqui é estrutural.
 */
@Composable
fun PaperCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = OlenaTheme.colors
    Box(
        modifier = modifier
            .drawBehind {
                val shift = 4.dp.toPx()
                drawRoundRect(
                    color = colors.lineStrong,
                    topLeft = Offset(0f, shift),
                    size = Size(size.width, size.height),
                    cornerRadius = CornerRadius(20.dp.toPx()),
                )
            }
            .background(colors.surface, CardShape)
            .border(1.dp, colors.line, CardShape)
            .padding(16.dp),
    ) {
        content()
    }
}
