package olenastudy.app.ui.screens

import android.provider.Settings
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import app.rive.runtime.kotlin.RiveAnimationView
import app.rive.runtime.kotlin.core.Fit
import app.rive.runtime.kotlin.core.Rive
import olenastudy.app.R

private object FocusRiveRuntime {
    private var initialized = false

    @Synchronized
    fun ensure(context: android.content.Context) {
        if (!initialized) {
            Rive.init(context.applicationContext)
            initialized = true
        }
    }
}

/** Mesmo arquivo e enquadramento do canvas web. O quadro estático cobre carga e movimento reduzido. */
@Composable
internal fun FocusTomato(stage: Int, staticArt: Int, modifier: Modifier = Modifier, animated: Boolean = true, onReady: (Boolean) -> Unit = {}) {
    val context = LocalContext.current
    val motion = !LocalInspectionMode.current && animated &&
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0f
    var ready by remember(motion) { mutableStateOf(false) }
    BoxWithConstraints(modifier) {
        if (!ready) Image(painterResource(staticArt), null, Modifier.fillMaxSize())
        if (motion) {
            // A prancheta do Rive inclui a área de voo dos pedaços, como TOMATO_ART na web.
            val artWidth = maxWidth * 1.8943f
            val artHeight = maxHeight * 1.8605f
            AndroidView(
                modifier = Modifier.offset(x = maxWidth * -.4471f, y = maxHeight * -.586f)
                    .wrapContentSize(Alignment.TopStart, unbounded = true)
                    .requiredSize(artWidth, artHeight),
                factory = { host ->
                    android.widget.FrameLayout(host).apply {
                        clipChildren = false
                        try {
                            FocusRiveRuntime.ensure(host)
                            addView(RiveAnimationView(host).apply {
                                setRiveResource(R.raw.focus_tomato, stateMachineName = "Tomate", fit = Fit.CONTAIN)
                                setBooleanState("Tomate", "instante", true)
                                setNumberState("Tomate", "etapa", stage.toFloat())
                                tag = stage
                                postDelayed({ setBooleanState("Tomate", "instante", false) }, 150)
                            }, android.widget.FrameLayout.LayoutParams(-1, -1))
                            ready = true
                            onReady(true)
                        } catch (_: RuntimeException) {
                            ready = false
                            onReady(false)
                        } catch (_: UnsatisfiedLinkError) {
                            ready = false
                            onReady(false)
                        }
                    }
                },
                update = { holder ->
                    val view = holder.getChildAt(0) as? RiveAnimationView
                    if (view != null && view.tag != stage) {
                        val before = view.tag as? Int ?: stage
                        val jump = stage != 0 && stage != before + 1
                        view.setBooleanState("Tomate", "instante", jump)
                        view.setNumberState("Tomate", "etapa", stage.toFloat())
                        view.tag = stage
                        if (jump) view.postDelayed({ view.setBooleanState("Tomate", "instante", false) }, 150)
                    }
                },
                onRelease = { holder ->
                    (holder.getChildAt(0) as? RiveAnimationView)?.stop()
                    onReady(false)
                },
            )
        }
    }
}
