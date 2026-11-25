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
    fun `o ícone muda com o tema e com a seleção`() {
        val planner = AppDestination.Planner
        assertNotEquals(planner.icon(selected = false, darkTheme = false), planner.icon(selected = false, darkTheme = true))
        assertNotEquals(planner.icon(selected = false, darkTheme = false), planner.icon(selected = true, darkTheme = false))
        // Selecionado usa o mesmo ícone roxo nos dois temas.
        assertEquals(planner.icon(selected = true, darkTheme = false), planner.icon(selected = true, darkTheme = true))
    }

    @Test
    fun `o perfil usa ícone mais claro no tema escuro e outro quando ativo`() {
        val profile = AppDestination.Profile
        assertNotEquals(profile.icon(selected = false, darkTheme = false), profile.icon(selected = false, darkTheme = true))
        assertEquals(profile.icon(selected = true, darkTheme = false), profile.icon(selected = true, darkTheme = true))
        assertTrue(profile.icon(selected = true, darkTheme = false) != profile.icon(selected = false, darkTheme = false))
    }
}
