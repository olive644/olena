package olenastudy.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.LocalHighlightSelections
import olenastudy.app.ui.LocalReduceMotion

enum class PaperButtonStyle { Primary, Accent, Quiet }

private val ButtonShape = RoundedCornerShape(14.dp)

/**
 * Botão de papel recortado, como os do site: faceta mais clara no canto superior esquerdo e uma
 * borda inferior mais escura. O alvo de toque tem no mínimo 48 dp de altura.
 */
@Composable
fun PaperButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: PaperButtonStyle = PaperButtonStyle.Primary,
    selected: Boolean = false,
    enabled: Boolean = true,
    leading: (@Composable () -> Unit)? = null,
    horizontalPadding: androidx.compose.ui.unit.Dp = 20.dp,
) {
    val colors = OlenaTheme.colors
    val (base, ink) =
        when (style) {
            PaperButtonStyle.Primary -> Color(0xFF7433E0) to Color.White
            PaperButtonStyle.Accent -> colors.yellow to colors.ink
            PaperButtonStyle.Quiet -> (if (selected) colors.lavender else colors.soft) to colors.text
        }
    val primary = style == PaperButtonStyle.Primary
    val facet = if (primary) Color(0xFF8A4CE5) else lerp(base, Color.White, 0.28f)
    val edge = if (primary) Color(0xFF4B209B) else lerp(base, Color.Black, 0.22f)
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val focused by source.collectIsFocusedAsState()
    val focusColor = if (LocalHighlightSelections.current) colors.yellow else ink
    val reduceMotion = LocalReduceMotion.current
    val press by animateFloatAsState(if (pressed && !reduceMotion) 0.97f else 1f, tween(if (reduceMotion) 0 else 120), label = "button-press")
    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = press
                scaleY = press
                alpha = if (enabled) 1f else 0.45f
            }
            .defaultMinSize(minHeight = 48.dp)
            .clip(ButtonShape)
            .drawBehind {
                drawRect(base)
                val edgeHeight = 4.dp.toPx()
                drawRect(edge, topLeft = Offset(0f, size.height - edgeHeight), size = androidx.compose.ui.geometry.Size(size.width, edgeHeight))
                val facetPath =
                    Path().apply {
                        moveTo(0f, 0f)
                        lineTo(size.width * 0.22f, 0f)
                        lineTo(0f, size.height * 0.62f)
                        close()
                    }
                drawPath(facetPath, facet)
                val cornerPath =
                    Path().apply {
                        moveTo(size.width, size.height - edgeHeight)
                        lineTo(size.width * 0.82f, size.height - edgeHeight)
                        lineTo(size.width, size.height * 0.38f)
                        close()
                    }
                drawPath(cornerPath, edge)
                if (focused) {
                    val inset = 12.dp.toPx()
                    drawLine(focusColor, Offset(inset, size.height - 7.dp.toPx()), Offset(size.width - inset, size.height - 7.dp.toPx()), strokeWidth = 3.dp.toPx())
                }
            }
            .clickable(enabled = enabled, interactionSource = source, indication = null, role = Role.Button, onClick = onClick)
            .padding(horizontal = horizontalPadding, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            leading?.invoke()
            if (text.isNotEmpty()) Text(text = text, style = MaterialTheme.typography.labelLarge, color = ink, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
}
