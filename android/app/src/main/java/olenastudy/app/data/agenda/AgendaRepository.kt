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
import olenastudy.app.domain.agenda.StudyEvent

private val Context.agendaStore by preferencesDataStore(name = "agenda")
private val EventsKey = stringPreferencesKey("events_json")

/** Lê e grava a lista de compromissos como JSON. Aceita JSON com campos desconhecidos. */
object AgendaCodec {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val serializer = ListSerializer(StudyEvent.serializer())

    fun encode(events: List<StudyEvent>): String = json.encodeToString(serializer, events)

    /** JSON ausente ou quebrado vira lista vazia, nunca derruba o app nem o widget. */
    fun decode(text: String?): List<StudyEvent> =
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

/**
 * Compromissos neste aparelho. Agenda pertence à conta e vai sincronizar quando o login entrar;
 * até lá isto é cache local, e o app diz isso na tela em vez de fingir que salvou na nuvem.
 */
class AgendaRepository(private val context: Context) {
    val events: Flow<List<StudyEvent>> = context.agendaStore.data.map { AgendaCodec.decode(it[EventsKey]) }

    suspend fun current(): List<StudyEvent> = events.first()

    suspend fun add(event: StudyEvent) = change { it + event }

    suspend fun remove(id: String) = change { list -> list.filterNot { it.id == id } }

    private suspend fun change(transform: (List<StudyEvent>) -> List<StudyEvent>) {
        context.agendaStore.edit { prefs ->
            prefs[EventsKey] = AgendaCodec.encode(transform(AgendaCodec.decode(prefs[EventsKey])))
        }
    }
}
