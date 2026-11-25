package olenastudy.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import olenastudy.app.ui.OlenaTheme

private val CardShape = RoundedCornerShape(24.dp)

/**
 * Painel de papel do site: fundo, borda estrutural, uma base deslocada para baixo e as duas facetas
 * de canto (clara no canto superior esquerdo, escura no inferior direito). Não é moldura de foco.
 */
fun Modifier.paperPanel(
    fill: Color,
    base: Color,
    facetLight: Color,
    facetDark: Color,
    border: Color,
    shape: Shape = CardShape,
    radius: Dp = 24.dp,
    facet: Dp = 46.dp,
    shift: Dp = 5.dp,
): Modifier =
    this
        .drawBehind {
            val outline = shape.createOutline(size, layoutDirection, this)
            translate(top = shift.toPx()) { drawOutline(outline, base) }
        }
        .clip(shape)
        .background(fill)
        .drawBehind {
            val f = facet.toPx()
            drawPath(
                Path().apply { moveTo(0f, 0f); lineTo(f, 0f); lineTo(0f, f); close() },
                facetLight,
            )
            drawPath(
                Path().apply { moveTo(size.width, size.height); lineTo(size.width - f, size.height); lineTo(size.width, size.height - f); close() },
                facetDark,
            )
        }
        .border(1.dp, border, shape)

/** Cartão de papel padrão (fundo `surface`). */
@Composable
fun PaperCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val colors = OlenaTheme.colors
    Box(
        modifier = modifier
            .paperPanel(
                fill = colors.surface,
                base = colors.lineStrong,
                facetLight = colors.soft,
                facetDark = colors.line,
                border = colors.line,
            )
            .padding(horizontal = 18.dp, vertical = 18.dp),
    ) {
        content()
    }
}
