package olenastudy.app.data.agenda

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import olenastudy.app.domain.agenda.StudyTask

private val Context.taskStore by preferencesDataStore(name = "tasks")
private val TasksKey = stringPreferencesKey("tasks_json")

/** Lê e grava as tarefas como JSON. JSON ausente ou quebrado vira lista vazia, nunca derruba o app. */
object TaskCodec {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val serializer = ListSerializer(StudyTask.serializer())

    fun encode(tasks: List<StudyTask>): String = json.encodeToString(serializer, tasks)

    fun decode(text: String?): List<StudyTask> =
        if (text.isNullOrBlank()) {
            emptyList()
        } else {
            try {
                json.decodeFromString(serializer, text)
            } catch (_: SerializationException) {
                emptyList()
            } catch (_: IllegalArgumentException) {
                emptyList()
            }
        }
}

/** Tarefas neste aparelho. Pertencem à conta e vão sincronizar com o login; até lá são cache local. */
class TaskRepository(private val context: Context) {
    val tasks: Flow<List<StudyTask>> = context.taskStore.data.map { TaskCodec.decode(it[TasksKey]) }

    suspend fun current(): List<StudyTask> = tasks.first()

    suspend fun add(task: StudyTask) = change { it + task }

    suspend fun toggle(id: String) = change { list -> list.map { if (it.id == id) it.copy(completed = !it.completed) else it } }

    suspend fun remove(id: String) = change { list -> list.filterNot { it.id == id } }

    private suspend fun change(transform: (List<StudyTask>) -> List<StudyTask>) {
        context.taskStore.edit { prefs -> prefs[TasksKey] = TaskCodec.encode(transform(TaskCodec.decode(prefs[TasksKey]))) }
    }
}
