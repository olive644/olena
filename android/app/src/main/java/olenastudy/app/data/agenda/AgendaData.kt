package olenastudy.app.data.agenda

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import olenastudy.app.domain.agenda.StudyEvent
import olenastudy.app.domain.agenda.StudyTask

data class AgendaData(val events: List<StudyEvent>, val tasks: List<StudyTask>)

/** Só libera a agenda quando as duas leituras responderem, inclusive com listas vazias. */
fun agendaData(repository: AgendaRepository, taskRepository: TaskRepository): Flow<AgendaData> =
    agendaData(repository.events, taskRepository.tasks)

internal fun agendaData(events: Flow<List<StudyEvent>>, tasks: Flow<List<StudyTask>>): Flow<AgendaData> =
    combine(events, tasks, ::AgendaData)
