package olenastudy.app.data.arcana

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ArcanaCatalogTest {
    private val all = ArcanaCatalog.parse(File("src/main/assets/arcana.json").readText())

    @Test
    fun `galeria do site tem 78 cartas com ids unicos`() {
        assertEquals(78, all.size)
        assertEquals(78, all.map { it.id }.toSet().size)
    }

    @Test
    fun `categorias somam as cartas como no site`() {
        assertEquals(22, ArcanaCatalog.filter(all, ArcanaCategory.Major).size)
        assertEquals(56, ArcanaCatalog.filter(all, ArcanaCategory.Minor).size)
        listOf(ArcanaCategory.Wands, ArcanaCategory.Cups, ArcanaCategory.Swords, ArcanaCategory.Pentacles).forEach {
            assertEquals(14, ArcanaCatalog.filter(all, it).size)
        }
        assertEquals(78, ArcanaCatalog.filter(all, ArcanaCategory.All).size)
    }

    @Test
    fun `cada carta tem arte nos dois temas e raridade conhecida`() {
        all.forEach {
            assertTrue("sem arte clara de ${it.id}", File("src/main/assets/" + ArcanaCatalog.artPath(it.id, false)).exists())
            assertTrue("sem arte escura de ${it.id}", File("src/main/assets/" + ArcanaCatalog.artPath(it.id, true)).exists())
            assertTrue(it.rarity in setOf(0, 2, 3))
        }
    }

    @Test
    fun `primeira carta e o louco`() {
        assertEquals("O Louco", all.first().name)
        assertEquals("Épica", all.first().rarityLabel)
    }

    @Test
    fun `texto quebrado vira lista vazia`() {
        assertTrue(ArcanaCatalog.parse("{ nao e json").isEmpty())
    }
}
