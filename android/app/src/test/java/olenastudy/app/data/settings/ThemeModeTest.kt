package olenastudy.app.data.settings

import org.junit.Assert.assertEquals
import org.junit.Test

class ThemeModeTest {
    @Test
    fun `valores guardados válidos voltam como estavam`() {
        ThemeMode.entries.forEach { assertEquals(it, ThemeMode.parse(it.name)) }
    }

    @Test
    fun `valor ausente, vazio ou desconhecido segue o sistema`() {
        assertEquals(ThemeMode.System, ThemeMode.parse(null))
        assertEquals(ThemeMode.System, ThemeMode.parse(""))
        assertEquals(ThemeMode.System, ThemeMode.parse("roxo"))
        assertEquals(ThemeMode.System, ThemeMode.parse("dark"))
    }
}
