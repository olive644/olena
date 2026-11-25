package olenastudy.app.domain.agenda

import olenastudy.app.data.agenda.TaskCodec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TasksTest {
    private val a = StudyTask("a", "Ler capítulo 3", "2026-11-25")
    private val b = StudyTask("b", "Estudar frações", "2026-11-25", completed = true)
    private val c = StudyTask("c", "Entregar redação", "2026-11-27")

    @Test
    fun `tarefas do dia, pendentes primeiro`() {
        assertEquals(listOf("a", "b"), Tasks.dueOn(listOf(b, a, c), "2026-11-25").map { it.id })
        assertTrue(Tasks.dueOn(listOf(a, b, c), "2026-11-26").isEmpty())
    }

    @Test
    fun `pendencias contam so as nao concluidas, de qualquer dia`() {
        assertEquals(2, Tasks.pendingCount(listOf(a, b, c)))
        assertEquals(0, Tasks.pendingCount(emptyList()))
    }

    @Test
    fun `ida e volta do JSON e texto quebrado vira lista vazia`() {
        assertEquals(listOf(a, b, c), TaskCodec.decode(TaskCodec.encode(listOf(a, b, c))))
        assertTrue(TaskCodec.decode(null).isEmpty())
        assertTrue(TaskCodec.decode("{ nao e json").isEmpty())
    }
}
