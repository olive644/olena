package olenastudy.app.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import olenastudy.app.ui.OlenaTheme

/** Cores dos diálogos do Perfil nos dois temas, medidas do site (`dialog.profile-editor`, campos e botões secundários). */
internal object Dlg {
    val bg: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF262230) else Color(0xFFFFF9EF)
    val line: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF35313E) else Color(0xFFE6DDC9)
    val ink: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFFF4F2EE) else Color(0xFF292432)
    val muted: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFFA9A3AD) else Color(0xFF6B6570)
    val secondary: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF201D26) else Color.White
    val secondaryFacet: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2)
    val input: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF292432) else Color.White
    val inputOff: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF201D26) else Color(0xFFF1E9DC)
    val inputBorder: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF51465D) else Color(0xFFD7CBB7)
    val inputText: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFFFFF9EF) else Color(0xFF292432)
    val section: Color @Composable get() = if (OlenaTheme.colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2)
    val shadow: Int = 7
}
