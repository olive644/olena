package olenastudy.app.domain.agenda

import kotlinx.serialization.Serializable

/** Tarefa com prazo. Mesmos campos principais de `StudyTask` do site (id, título, prazo e conclusão). */
@Serializable
data class StudyTask(
    val id: String,
    val title: String,
    /** "AAAA-MM-DD". */
    val dueDate: String,
    val completed: Boolean = false,
)

object Tasks {
    /** Tarefas com prazo naquele dia, as pendentes primeiro e por título. */
    fun dueOn(tasks: List<StudyTask>, date: String): List<StudyTask> =
        tasks.filter { it.dueDate == date }.sortedWith(compareBy({ it.completed }, { it.title }))

    /** Pendências: tarefas ainda não concluídas, de qualquer dia (o contador do Espaço). */
    fun pendingCount(tasks: List<StudyTask>): Int = tasks.count { !it.completed }
}
