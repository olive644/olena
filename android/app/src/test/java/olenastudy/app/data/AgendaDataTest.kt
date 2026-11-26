package olenastudy.app.data

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import olenastudy.app.data.agenda.AgendaData
import olenastudy.app.data.agenda.agendaData
import olenastudy.app.domain.agenda.StudyEvent
import olenastudy.app.domain.agenda.StudyTask
import org.junit.Assert.assertEquals
import org.junit.Test

class AgendaDataTest {
    @Test fun aFastEventReadDoesNotInventAnEmptyTaskList() = runBlocking {
        val events = CompletableDeferred<List<StudyEvent>>()
        val tasks = CompletableDeferred<List<StudyTask>>()
        val observed = mutableListOf<ReadState<AgendaData>>()
        val reader = launch(start = CoroutineStart.UNDISPATCHED) {
            agendaData(flow { emit(events.await()) }, flow { emit(tasks.await()) }).asReadState().toList(observed)
        }
        val saved = listOf(StudyEvent("saved", "Revisão", date = "2026-11-25", time = "09:30"))
        events.complete(saved)
        yield()
        assertEquals(listOf(ReadState.Loading), observed)
        tasks.complete(emptyList())
        reader.join()
        assertEquals(listOf(ReadState.Loading, ReadState.Ready(AgendaData(saved, emptyList()))), observed)
    }
}
