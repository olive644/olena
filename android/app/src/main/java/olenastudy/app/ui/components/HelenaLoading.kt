package olenastudy.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.progressSemantics
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import olenastudy.app.ui.LocalReduceMotion
import olenastudy.app.ui.OlenaTheme
import kotlin.math.tan

/**
 * Adaptação nativa de public/helena-pencil-loading.svg.
 * Adapted from Uiverse.io by gustavofusco, supplied by owner.
 * O texto anuncia o status; o desenho é decorativo e fica estático com movimento reduzido.
 */
@Composable
fun HelenaLoading(label: String, modifier: Modifier = Modifier) {
    val reduced = LocalReduceMotion.current
    val phase = if (reduced) 0f else {
        val transition = rememberInfiniteTransition(label = "helena-pencil")
        val value by transition.animateFloat(
            0f, 1f,
            infiniteRepeatable(tween(3000, easing = LinearEasing), RepeatMode.Restart),
            label = "pencil-turn",
        )
        value
    }
    Column(
        modifier.progressSemantics().semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Canvas(Modifier.size(128.dp)) { pencil(phase, reduced) }
        Text(label, style = MaterialTheme.typography.bodyLarge, color = OlenaTheme.colors.text)
    }
}

private fun DrawScope.pencil(phase: Float, reduced: Boolean) {
    val wave = if (phase <= 0.5f) phase * 2 else (1 - phase) * 2
    val bodyAngle = -90f - 135f * wave
    val sweep = 45f + 180f * wave
    translate(size.width / 2, size.height / 2) {
        scale(size.width / 200f, pivot = Offset.Zero) {
            val strokeSweep = if (reduced) 90f else when {
                phase <= 0.5f -> 225f * phase * 2
                phase < 0.75f -> 225f * (0.75f - phase) * 4
                else -> 0f
            }
            val strokeAngle = if (phase <= 0.5f) -113f else -113f + 225f * ((phase - 0.5f) * 4).coerceAtMost(1f)
            drawArc(Color(0xFF7C3AED), strokeAngle, strokeSweep, false, Offset(-70f, -70f), Size(140f, 140f), style = Stroke(2f))
            rotate(phase * 720f, pivot = Offset.Zero) {
                fun arc(radius: Float, width: Float, color: Color) {
                    drawArc(color, bodyAngle, sweep, false, Offset(-radius, -radius), Size(radius * 2, radius * 2), style = Stroke(width))
                }
                arc(64f, 30f, Color(0xFF7C3AED))
                arc(74f, 10f, Color(0xFFA779EF))
                arc(54f, 10f, Color(0xFF51259B))
                rotate(-45f + 45f * wave, pivot = Offset.Zero) {
                    translate(49f, 0f) {
                        eraser(phase)
                    }
                }
                rotate(bodyAngle, pivot = Offset.Zero) {
                    translate(49f, -30f) {
                        polygon(Color(0xFFF1D8A7), 15f, 0f, 30f, 30f, 0f, 30f)
                        polygon(Color(0xFFC9A56F), 15f, 0f, 7f, 30f, 0f, 30f)
                        polygon(Color(0xFFFFF9EF), 15f, 0f, 30f, 30f, 22f, 30f)
                        polygon(Color(0xFF292432), 15f, 0f, 20f, 10f, 10f, 10f)
                    }
                }
            }
        }
    }
}

private val SkewAngles = floatArrayOf(0f, -4f, 8f, -15f, 15f, -15f, 15f, -15f, 15f, -15f, 15f, -15f, 8f, -4f, 0f)
private val SkewEasing = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)

private fun DrawScope.eraser(phase: Float) {
    val position = ((phase - 0.325f) / 0.025f).coerceIn(0f, 14f)
    val index = position.toInt().coerceAtMost(13)
    val angle = SkewAngles[index] + (SkewAngles[index + 1] - SkewAngles[index]) * SkewEasing.transform(position - index)
    val skew = tan(Math.toRadians(angle.toDouble())).toFloat()
    fun shape(color: Color, vararg points: Float) {
        polygon(color, *FloatArray(points.size) { i -> if (i % 2 == 0) points[i] + points[i + 1] * skew else points[i] })
    }
    shape(Color(0xFFFACC15), 0f, 0f, 30f, 0f, 30f, 25f, 25f, 30f, 4f, 30f, 0f, 26f)
    shape(Color(0xFFFFE88D), 0f, 0f, 9f, 0f, 5f, 30f, 4f, 30f, 0f, 26f)
    shape(Color(0xFFD5A71A), 24f, 0f, 30f, 0f, 30f, 25f, 25f, 30f, 20f, 30f)
    shape(Color(0xFFFFF9EF), 0f, 0f, 30f, 0f, 30f, 20f, 0f, 20f)
    shape(Color(0xFFC9BBA2), 0f, 0f, 6f, 0f, 6f, 20f, 0f, 20f)
    shape(Color(0xFFC9BBA2), 22f, 0f, 30f, 0f, 30f, 20f, 22f, 20f)
    shape(Color(0xFF51465D), 0f, 6f, 30f, 6f, 30f, 8f, 0f, 8f)
    shape(Color(0xFF51465D), 0f, 13f, 30f, 13f, 30f, 15f, 0f, 15f)
}

private fun DrawScope.polygon(color: Color, vararg coordinates: Float) {
    drawPath(Path().apply {
        moveTo(coordinates[0], coordinates[1])
        for (i in 2 until coordinates.size step 2) lineTo(coordinates[i], coordinates[i + 1])
        close()
    }, color)
}
