package olenastudy.app.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import olenastudy.app.R
import olenastudy.app.ui.OlenaTheme

/**
 * Fundo do perfil escolhido, como `data-profile-background` do site: "Papel original" é o fundo liso do cartão,
 * "Céu de papel" repete o padrão de céu (540 de largura), "Caderno geométrico" repete as linhas de 66 x 114 e os
 * demais esticam a arte do site sobre o cartão (100% x 100%).
 */
@Composable
fun Modifier.profileBackground(id: String): Modifier {
    val dark = OlenaTheme.colors.isDark
    val context = LocalContext.current
    return when (id) {
        "paper" -> this
        "night" -> tiled(ImageBitmap.imageResource(if (dark) R.drawable.art_bg_night_tile_dark else R.drawable.art_bg_night_tile), tileWidthDp = 540f, widthPx = 540)
        "geometry" -> tiled(ImageBitmap.imageResource(if (dark) R.drawable.art_bg_geometry_tile_dark else R.drawable.art_bg_geometry_tile), tileWidthDp = 132f, widthPx = 132)
        else -> {
            val res = context.resources.getIdentifier("art_bg_$id", "drawable", context.packageName)
            if (res == 0) this else stretched(ImageBitmap.imageResource(res))
        }
    }
}

private fun Modifier.stretched(image: ImageBitmap): Modifier =
    drawBehind { drawImage(image, dstSize = IntSize(size.width.toInt(), size.height.toInt())) }

private fun Modifier.tiled(image: ImageBitmap, tileWidthDp: Float, widthPx: Int): Modifier =
    drawBehind {
        val tileW = (tileWidthDp * density).toInt().coerceAtLeast(1)
        val tileH = (tileW * image.height.toFloat() / widthPx.coerceAtLeast(1) * (widthPx.toFloat() / image.width)).toInt().coerceAtLeast(1)
        var y = 0
        while (y < size.height) {
            var x = 0
            while (x < size.width) {
                drawTile(image, x, y, tileW, tileH)
                x += tileW
            }
            y += tileH
        }
    }

private fun DrawScope.drawTile(image: ImageBitmap, x: Int, y: Int, w: Int, h: Int) =
    drawImage(image, dstOffset = IntOffset(x, y), dstSize = IntSize(w, h))
