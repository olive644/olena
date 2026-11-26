package olenastudy.app.ui.components

import android.graphics.BitmapFactory
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.progressSemantics
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.graphics.ImageBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.ui.LocalReduceMotion
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme

private const val FRAMES = 90

/**
 * Loading original do site (`HelenaLoading`): o lápis animado de 3 s, 152 de largura, e o texto "Preparando seu espaço…"
 * em Manrope 14,4 bold na cor secundária, centralizados. Os 30 quadros foram exportados do próprio SVG do site.
 * O texto anuncia o status. Com movimento reduzido o lápis fica no primeiro quadro. Quem quiser ocupar a tela inteira
 * passa `Modifier.fillMaxSize()`; dentro de listas rolantes o componente ocupa só o próprio tamanho.
 */
@Composable
fun HelenaLoading(label: String = "Preparando seu espaço…", modifier: Modifier = Modifier) {
    val colors = OlenaTheme.colors
    val context = LocalContext.current
    val reduced = LocalReduceMotion.current
    // Decodifica os quadros fora da thread principal para a animação abrir sem engasgar.
    val frames by produceState<List<ImageBitmap>>(emptyList(), colors.isDark) {
        val suffix = if (colors.isDark) "_dark" else ""
        value = withContext(Dispatchers.IO) { List(FRAMES) { i -> context.assets.open("loading/pencil${suffix}_${i.toString().padStart(2, '0')}.png").use { BitmapFactory.decodeStream(it) }.asImageBitmap() } }
    }
    val progress = if (reduced) 0f else {
        val value by rememberInfiniteTransition(label = "helena-loading").animateFloat(
            initialValue = 0f,
            targetValue = FRAMES.toFloat(),
            animationSpec = infiniteRepeatable(tween(3000, easing = LinearEasing), RepeatMode.Restart),
            label = "pencil",
        )
        value
    }
    Column(
        modifier.progressSemantics().semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
    ) {
        if (frames.isEmpty()) Spacer(Modifier.size(152.dp)) else Image(frames[progress.toInt().coerceIn(0, FRAMES - 1)], null, Modifier.size(152.dp))
        Text(label, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 14.4.sp, color = colors.muted, textAlign = TextAlign.Center)
    }
}
