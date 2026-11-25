package olenastudy.app.ui

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import olenastudy.app.R

// Manrope nos títulos (--font-display do site) e Nunito no texto corrido (--font-body).
// As duas são fontes variáveis com licença OFL (cópias em assets/licencas): um arquivo por família,
// com o peso escolhido pelo eixo "wght". Exigem API 26, que é o minSdk do app.

@OptIn(ExperimentalTextApi::class)
private fun variable(resId: Int, weight: FontWeight) =
    Font(
        resId = resId,
        weight = weight,
        variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)),
    )

val ManropeFamily = FontFamily(
    variable(R.font.manrope_variable, FontWeight.SemiBold),
    variable(R.font.manrope_variable, FontWeight.Bold),
    variable(R.font.manrope_variable, FontWeight.ExtraBold),
)

val NunitoFamily = FontFamily(
    variable(R.font.nunito_variable, FontWeight.Normal),
    variable(R.font.nunito_variable, FontWeight.Medium),
    variable(R.font.nunito_variable, FontWeight.SemiBold),
    variable(R.font.nunito_variable, FontWeight.Bold),
)

val OlenaTypography = Typography(
    displayLarge = TextStyle(fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 40.sp, lineHeight = 46.sp),
    headlineLarge = TextStyle(fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp, lineHeight = 36.sp),
    headlineMedium = TextStyle(fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 30.sp),
    titleLarge = TextStyle(fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = ManropeFamily, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
    bodyLarge = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 21.sp),
    labelLarge = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 20.sp),
    labelMedium = TextStyle(fontFamily = NunitoFamily, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, lineHeight = 16.sp),
)
