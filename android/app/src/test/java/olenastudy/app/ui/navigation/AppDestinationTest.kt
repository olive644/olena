package olenastudy.app.ui.navigation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AppDestinationTest {
    @Test
    fun `a ordem segue a barra móvel do site`() {
        assertEquals(
            listOf("today", "planner", "learn", "focus", "library", "profile"),
            AppDestination.entries.map { it.route },
        )
    }

    @Test
    fun `as rotas são únicas`() {
        assertEquals(AppDestination.entries.size, AppDestination.entries.map { it.route }.toSet().size)
    }

    @Test
    fun `rota desconhecida ou ausente volta ao Espaço`() {
        assertEquals(AppDestination.Today, AppDestination.fromRoute(null))
        assertEquals(AppDestination.Today, AppDestination.fromRoute("inexistente"))
        assertEquals(AppDestination.Focus, AppDestination.fromRoute("focus"))
    }

    @Test
    fun `configurações mantém o Perfil selecionado na navegação`() {
        assertEquals(AppDestination.Profile, AppDestination.fromRoute(AppDestination.SETTINGS_ROUTE))
    }

    @Test
    fun `o ícone muda com o tema e com a seleção`() {
        val planner = AppDestination.Planner
        assertNotEquals(planner.icon(selected = false, darkTheme = false), planner.icon(selected = false, darkTheme = true))
        assertNotEquals(planner.icon(selected = false, darkTheme = false), planner.icon(selected = true, darkTheme = false))
        // Selecionado usa o mesmo ícone roxo nos dois temas.
        assertEquals(planner.icon(selected = true, darkTheme = false), planner.icon(selected = true, darkTheme = true))
    }

    @Test
    fun `o perfil mostra o mesmo avatar em qualquer tema e estado`() {
        val profile = AppDestination.Profile
        val all = listOf(false, true).flatMap { dark -> listOf(false, true).map { selected -> profile.icon(selected, dark) } }.toSet()
        assertEquals(1, all.size)
    }
}
