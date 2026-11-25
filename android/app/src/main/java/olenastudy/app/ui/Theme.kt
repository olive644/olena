package olenastudy.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Paleta oficial do site (bloco "Paleta oficial da marca" em src/styles.css), em dois temas.
 * Os nomes seguem as variáveis CSS (--page, --surface, --soft, --lavender, --line...), para o
 * site e o app falarem a mesma língua. `ink` fica igual nos dois temas, como no site: é o fundo
 * escuro fixo de botões primários e chips ativos.
 */
@Immutable
data class OlenaColors(
    val ink: Color,
    val text: Color,
    val muted: Color,
    val violet: Color,
    val violetDark: Color,
    val yellow: Color,
    val page: Color,
    val surface: Color,
    val soft: Color,
    val lavender: Color,
    val line: Color,
    val lineStrong: Color,
    val isDark: Boolean,
)

val LightOlenaColors = OlenaColors(
    ink = Color(0xFF0F0F14),
    text = Color(0xFF0F0F14),
    muted = Color(0xFF6B6570),
    violet = Color(0xFF7C3AED),
    violetDark = Color(0xFF6D28D9),
    yellow = Color(0xFFFACC15),
    page = Color(0xFFFFF9EF),
    surface = Color(0xFFFFFFFF),
    soft = Color(0xFFFBF2E2),
    lavender = Color(0xFFEFE6FD),
    line = Color(0xFFE6DDC9),
    lineStrong = Color(0xFFD3C7AC),
    isDark = false,
)

val DarkOlenaColors = OlenaColors(
    ink = Color(0xFF0F0F14),
    text = Color(0xFFF4F2EE),
    muted = Color(0xFFA9A3AD),
    violet = Color(0xFFA685FA),
    violetDark = Color(0xFF8B5CF6),
    yellow = Color(0xFFFACC15),
    page = Color(0xFF17151C),
    surface = Color(0xFF201D26),
    soft = Color(0xFF262230),
    lavender = Color(0xFF2C2540),
    line = Color(0xFF35313E),
    lineStrong = Color(0xFF423D4C),
    isDark = true,
)

private val LocalOlenaColors = staticCompositionLocalOf { LightOlenaColors }

/** Acesso às cores da marca: `OlenaTheme.colors.violet`, `OlenaTheme.colors.page`, etc. */
object OlenaTheme {
    val colors: OlenaColors
        @Composable
        @ReadOnlyComposable
        get() = LocalOlenaColors.current
}

private fun OlenaColors.toMaterial() =
    if (isDark) {
        darkColorScheme(
            primary = violet,
            onPrimary = Color.White,
            primaryContainer = lavender,
            onPrimaryContainer = text,
            secondary = yellow,
            onSecondary = ink,
            background = page,
            onBackground = text,
            surface = surface,
            onSurface = text,
            surfaceVariant = soft,
            onSurfaceVariant = muted,
            outline = lineStrong,
            outlineVariant = line,
        )
    } else {
        lightColorScheme(
            primary = violet,
            onPrimary = Color.White,
            primaryContainer = lavender,
            onPrimaryContainer = text,
            secondary = yellow,
            onSecondary = ink,
            background = page,
            onBackground = text,
            surface = surface,
            onSurface = text,
            surfaceVariant = soft,
            onSurfaceVariant = muted,
            outline = lineStrong,
            outlineVariant = line,
        )
    }

/**
 * Tema do OlenaStudy. Segue o modo escuro do sistema por padrão, como o site faz sem escolha
 * explícita. A escolha manual (claro ou escuro) entra junto com as configurações do app.
 */
@Composable
fun OlenaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkOlenaColors else LightOlenaColors
    CompositionLocalProvider(LocalOlenaColors provides colors) {
        MaterialTheme(
            colorScheme = colors.toMaterial(),
            typography = OlenaTypography,
            content = content,
        )
    }
}
