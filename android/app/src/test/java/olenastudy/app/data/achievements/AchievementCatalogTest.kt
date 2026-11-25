package olenastudy.app.data.achievements

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AchievementCatalogTest {
    private val all = AchievementCatalog.parse(File("src/main/assets/achievements.json").readText())

    @Test
    fun `galeria do site tem 59 familias em tres abas`() {
        assertEquals(59, all.size)
        assertEquals(17, AchievementCatalog.byTab(all, "math").size)
        assertEquals(22, AchievementCatalog.byTab(all, "english").size)
        assertEquals(20, AchievementCatalog.byTab(all, "general").size)
        assertEquals(59, all.map { it.id }.toSet().size)
    }

    @Test
    fun `cada cartao comeca bloqueado com progresso zero e tem arte`() {
        all.forEach {
            assertEquals("0", it.current)
            assertTrue(it.target.toInt() > 0)
            assertTrue("sem arte de ${it.id}", File("src/main/assets/ach/${it.id}.png").exists())
        }
    }

    @Test
    fun `primeiro cartao de matematica e o explorador das contas`() {
        val first = AchievementCatalog.byTab(all, "math").first()
        assertEquals("Explorador das contas", first.name)
        assertEquals("0/1", first.progress)
    }

    @Test
    fun `texto quebrado vira lista vazia`() {
        assertTrue(AchievementCatalog.parse("{ nao e json").isEmpty())
    }
}
