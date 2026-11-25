package olenastudy.app.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.annotation.DrawableRes
import olenastudy.app.R
import olenastudy.app.ui.OlenaTheme

private val LightDigits = intArrayOf(
    R.drawable.art_digit_0, R.drawable.art_digit_1, R.drawable.art_digit_2, R.drawable.art_digit_3, R.drawable.art_digit_4,
    R.drawable.art_digit_5, R.drawable.art_digit_6, R.drawable.art_digit_7, R.drawable.art_digit_8, R.drawable.art_digit_9,
)
private val DarkDigits = intArrayOf(
    R.drawable.art_digit_0_dark, R.drawable.art_digit_1_dark, R.drawable.art_digit_2_dark, R.drawable.art_digit_3_dark, R.drawable.art_digit_4_dark,
    R.drawable.art_digit_5_dark, R.drawable.art_digit_6_dark, R.drawable.art_digit_7_dark, R.drawable.art_digit_8_dark, R.drawable.art_digit_9_dark,
)

/** Imagem de cada dígito do relógio de papel do site (exportada do próprio site, em PNG). */
@DrawableRes
fun paperDigitRes(digit: Int, dark: Boolean): Int = (if (dark) DarkDigits else LightDigits)[digit]

/** Relógio com os dígitos de papel do site. Aceita só dígitos e ":" e ignora o resto. */
@Composable
fun PaperDigits(text: String, modifier: Modifier = Modifier, digitHeight: Dp = 60.dp) {
    val dark = OlenaTheme.colors.isDark
    val digitWidth = digitHeight * (66f / 98f)
    Row(
        modifier = modifier.clearAndSetSemantics { contentDescription = text },
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        text.forEach { char ->
            when {
                char in '0'..'9' ->
                    Image(painterResource(paperDigitRes(char - '0', dark)), null, Modifier.width(digitWidth).height(digitHeight))
                char == ':' ->
                    Image(
                        painterResource(if (dark) R.drawable.art_colon_dark else R.drawable.art_colon),
                        null,
                        Modifier.height(digitHeight * 0.55f),
                    )
            }
        }
    }
}
