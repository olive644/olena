package olenastudy.app.ui.screens

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import androidx.annotation.DrawableRes
import olenastudy.app.R
import olenastudy.app.domain.profile.ProfileLook
import olenastudy.app.domain.qr.QrCode
import olenastudy.app.domain.qr.QrLevel
import olenastudy.app.ui.components.paperDigitRes
import kotlin.math.max

/**
 * PNG do cartão do perfil, desenhado com as mesmas coordenadas do `save()` de `profile-share-card.tsx` do site:
 * tela de 720 x 960, capa de 220, foto de 360 (288 com moldura), selo de nível, nome e @ à esquerda e o QR de 240 à direita.
 */
object ShareCardPng {
    private const val W = 720
    private const val H = 960
    private val Cream = Color.parseColor("#FFF9EF")
    private val Ink = Color.parseColor("#292432")
    private val Muted = Color.parseColor("#51465D")

    fun render(context: Context, name: String, username: String, look: ProfileLook, link: String, level: Int = 1): Bitmap {
        val bitmap = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val res = context.resources
        val base = try { res.getFont(R.font.manrope_variable) } catch (_: Exception) { Typeface.DEFAULT }
        val smooth = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)
        fun text(size: Float, weight: Int, color: Int) = Paint(Paint.ANTI_ALIAS_FLAG).also {
            it.typeface = base
            it.fontVariationSettings = "'wght' $weight"
            it.textSize = size
            it.color = color
        }
        fun bitmapOf(@DrawableRes id: Int): Bitmap? = BitmapFactory.decodeResource(res, id)
        fun idOf(name: String): Int = res.getIdentifier(name, "drawable", context.packageName)

        canvas.drawColor(Cream)

        // Fundo escolhido (papel, céu e geometria ficam só com o creme, como no site).
        if (look.backgroundId !in listOf("paper", "night", "geometry")) {
            idOf("art_bg_${look.backgroundId}").takeIf { it != 0 }?.let { id ->
                bitmapOf(id)?.let { canvas.drawBitmap(it, null, RectF(0f, 220f, W.toFloat(), H.toFloat()), smooth) }
            }
        }

        // Capa recortada ao centro em 720 x 220.
        val coverRes = if (look.coverId == "helena") R.drawable.ic_profile_cover else idOf("art_cover_${look.coverId}").takeIf { it != 0 } ?: R.drawable.ic_profile_cover
        res.getDrawable(coverRes, context.theme)?.let { cover ->
            val natW = if (cover.intrinsicWidth > 0) cover.intrinsicWidth.toFloat() else 1200f
            val natH = if (cover.intrinsicHeight > 0) cover.intrinsicHeight.toFloat() else 320f
            val scale = max(W / natW, 220f / natH)
            val dw = natW * scale
            val dh = natH * scale
            val left = (W - dw) / 2f
            val top = (220f - dh) / 2f
            canvas.save()
            canvas.clipRect(0f, 0f, W.toFloat(), 220f)
            cover.setBounds(left.toInt(), top.toInt(), (left + dw).toInt(), (top + dh).toInt())
            cover.draw(canvas)
            canvas.restore()
        }
        canvas.drawText("OlenaStudy", 40f, 64f, text(30f, 800, Cream))

        // Foto e moldura.
        val avatar = bitmapOf(avatarArt(look.avatarId))
        val framed = look.frameId != "none"
        if (avatar != null) {
            val box = if (framed) RectF(216f, 156f, 504f, 444f) else RectF(180f, 120f, 540f, 480f)
            canvas.drawBitmap(avatar, null, box, smooth)
        }
        if (framed) {
            idOf("art_frame_${look.frameId}").takeIf { it != 0 }?.let { id ->
                bitmapOf(id)?.let { canvas.drawBitmap(it, null, RectF(181.44f, 121.44f, 538.56f, 478.56f), smooth) }
            }
        }

        // Selo de nível: pentágono amarelo com sombra, "NV" e os dígitos de papel.
        run {
            val scale = 360f / 140f
            val digits = level.toString().toList()
            val digitHeight = 22f * scale
            val digitWidth = digitHeight * 66f / 98f
            val nv = text(0.55f * 16f * scale, 900, Ink)
            val nvWidth = nv.measureText("NV")
            val content = nvWidth + 3f * scale + digits.size * digitWidth
            val width = max(44f * scale, content + 16f * scale)
            val height = 42f * scale
            val left = 540f + 9f * scale - width
            val top = 480f + 5f * scale - height
            fun pentagon(shift: Float) = Path().apply {
                moveTo(left + width * 0.12f, top + shift)
                lineTo(left + width * 0.9f, top + shift)
                lineTo(left + width, top + height * 0.7f + shift)
                lineTo(left + width * 0.5f, top + height + shift)
                lineTo(left, top + height * 0.7f + shift)
                close()
            }
            canvas.drawPath(pentagon(3f * scale), Paint(Paint.ANTI_ALIAS_FLAG).also { it.color = Color.parseColor("#B88C13") })
            canvas.drawPath(pentagon(0f), Paint(Paint.ANTI_ALIAS_FLAG).also { it.color = Color.parseColor("#FACC15") })
            val start = left + (width - content) / 2f
            val fm = nv.fontMetrics
            canvas.drawText("NV", start, top + height / 2f - (fm.ascent + fm.descent) / 2f, nv)
            digits.forEachIndexed { index, digit ->
                bitmapOf(paperDigitRes(digit - '0', false))?.let {
                    val x = start + nvWidth + 3f * scale + index * digitWidth
                    canvas.drawBitmap(it, null, RectF(x, top + (height - digitHeight) / 2f, x + digitWidth, top + (height + digitHeight) / 2f), smooth)
                }
            }
        }

        // Nome (de 44 px até caber em 640), @ e frase.
        var size = 44
        var namePaint: Paint
        do {
            namePaint = text((size--).toFloat(), 800, Ink)
        } while (namePaint.measureText(name) > 640f && size > 18)
        canvas.drawText(name, 40f, 536f, namePaint)
        if (username.isNotBlank()) canvas.drawText("@$username", 40f, 580f, text(28f, 700, Ink))
        canvas.drawText("Vamos estudar juntos?", 40f, 636f, text(22f, 600, Ink))

        drawQr(canvas, context, link)

        canvas.drawText("Compartilhar perfil", 40f, 730f, text(24f, 800, Color.parseColor("#7C3AED")))
        val small = text(17f, 500, Muted)
        canvas.drawText("olenastudy.app", 40f, 772f, small)
        if (username.isNotBlank()) canvas.drawText("@$username", 40f, 802f, small)
        canvas.drawText("Escaneie para encontrar meu perfil", 40f, (H - 34).toFloat(), text(18f, 700, Muted))
        return bitmap
    }

    /** QR de 240 em (430, 660): células arredondadas, três finders de papel e a estrela no centro. */
    private fun drawQr(canvas: Canvas, context: Context, link: String) {
        val matrix = QrCode.encode(link, QrLevel.H)
        val count = matrix.size
        val total = 240f
        val quiet = total * 4f / (count + 8)
        val cell = (total - quiet * 2f) / count
        val ox = 430f
        val oy = 660f
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = Cream
        canvas.drawRect(ox, oy, ox + total, oy + total, paint)
        paint.color = Ink
        for (row in 0 until count) for (column in 0 until count) {
            val inFinder = (row < 7 && column < 7) || (row < 7 && column >= count - 7) || (row >= count - 7 && column < 7)
            if (inFinder || !matrix.dark(row, column)) continue
            val x = ox + quiet + column * cell
            val y = oy + quiet + row * cell
            canvas.drawRoundRect(RectF(x, y, x + cell, y + cell), cell * 0.18f, cell * 0.18f, paint)
        }
        for ((column, row) in listOf(0 to 0, count - 7 to 0, 0 to count - 7)) {
            val x = ox + quiet + column * cell
            val y = oy + quiet + row * cell
            fun square(dx: Float, dy: Float, side: Float, color: Int, radius: Float) {
                paint.color = color
                canvas.drawRoundRect(RectF(x + dx, y + dy, x + dx + side, y + dy + side), radius, radius, paint)
            }
            square(0f, 0f, cell * 7, Color.parseColor("#0B5C66"), cell * 0.12f)
            square(cell, cell, cell * 5, Cream, cell * 0.1f)
            square(cell * 2, cell * 2, cell * 3, Ink, cell * 0.08f)
        }
        val logoSize = total * (1f - 8f / (count + 8)) * 0.24f
        BitmapFactory.decodeResource(context.resources, R.drawable.art_friends_logo)?.let {
            val left = ox + (total - logoSize) / 2f
            val top = oy + (total - logoSize) / 2f
            canvas.drawBitmap(it, null, RectF(left, top, left + logoSize, top + logoSize), Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
        }
    }
}
