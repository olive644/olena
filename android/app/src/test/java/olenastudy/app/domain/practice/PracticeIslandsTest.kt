package olenastudy.app.domain.practice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PracticeIslandsTest {
    @Test
    fun `sao nove ilhas numeradas em ordem e com ids unicos`() {
        assertEquals((1..9).toList(), PracticeIslands.all.map { it.number })
        assertEquals(9, PracticeIslands.all.map { it.id }.toSet().size)
    }

    @Test
    fun `so Ingles e Matematica estao disponiveis, como no site`() {
        assertEquals(listOf("english", "mathematics"), PracticeIslands.all.filter { it.available }.map { it.id })
    }

    @Test
    fun `o carrossel abre em Matematica`() {
        assertEquals("mathematics", PracticeIslands.all[PracticeIslands.startIndex].id)
        assertEquals(4, PracticeIslands.startIndex)
    }

    @Test
    fun `os textos da ilha de Matematica sao os do site`() {
        val math = PracticeIslands.all[PracticeIslands.startIndex]
        assertEquals("Picos dos Padrões", math.title)
        assertEquals("Das primeiras contas à matemática básica do dia a dia.", math.description)
        assertTrue(PracticeIslands.all.none { it.title.isBlank() || it.description.isBlank() })
    }
}
