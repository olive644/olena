package olenastudy.app.ui.components

import androidx.compose.foundation.clickable
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
) {
    val colors = OlenaTheme.colors
    val (base, ink) =
        when (style) {
            PaperButtonStyle.Primary -> colors.violet to Color.White
            PaperButtonStyle.Accent -> colors.yellow to colors.ink
            PaperButtonStyle.Quiet -> (if (selected) colors.lavender else colors.soft) to colors.text
        }
    val facet = lerp(base, Color.White, 0.28f)
    val edge = lerp(base, Color.Black, 0.22f)
    Box(
        modifier = modifier
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
            }
            .clickable(role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = text, style = MaterialTheme.typography.labelLarge, color = ink)
    }
}
