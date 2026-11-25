package olenastudy.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Cores iniciais tiradas do tema claro do site (fundo e texto da barra móvel).
// O sistema de design completo (papel recortado, tema escuro) entra em uma etapa própria.
private val PaperBackground = Color(0xFFFFF9EF)
private val PaperInk = Color(0xFF292432)

private val LightColors = lightColorScheme(
    background = PaperBackground,
    surface = PaperBackground,
    onBackground = PaperInk,
    onSurface = PaperInk,
)

@Composable
fun OlenaTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, content = content)
}
