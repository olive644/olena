package olenastudy.app.data.focus

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.serialization.SerializationException
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import java.io.IOException
import olenastudy.app.domain.focus.FocusPhase
import olenastudy.app.domain.focus.FocusRecord
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.PomodoroState
import olenastudy.app.domain.focus.StopwatchState

private val Context.focusStore by preferencesDataStore(name = "focus")

private val PhaseKey = stringPreferencesKey("phase")
private val CompletedKey = intPreferencesKey("completed")
private val DurationKey = intPreferencesKey("duration_minutes")
private val RunningKey = booleanPreferencesKey("running")
private val DeadlineKey = longPreferencesKey("deadline_ms")
private val RemainingKey = longPreferencesKey("remaining_ms")
private val FocusMinutesKey = intPreferencesKey("config_focus_minutes")
private val ShortBreakKey = intPreferencesKey("config_short_break_minutes")
private val LongBreakKey = intPreferencesKey("config_long_break_minutes")
private val LongBreaksKey = booleanPreferencesKey("config_long_breaks")
private val ModeKey = stringPreferencesKey("mode")
private val StopwatchRunningKey = booleanPreferencesKey("stopwatch_running")
private val StopwatchStartedKey = longPreferencesKey("stopwatch_started_ms")
private val StopwatchAccumulatedKey = longPreferencesKey("stopwatch_accumulated_ms")
private val RecordsKey = stringPreferencesKey("records_json")

enum class FocusMode { Timer, Pomodoro }

/** Tudo do Foco que precisa sobreviver ao app fechado. */
data class FocusSnapshot(
    val pomodoro: PomodoroState,
    val config: PomodoroConfig,
    val mode: FocusMode,
    val stopwatch: StopwatchState,
    val records: List<FocusRecord>,
)

object FocusRecordsCodec {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val serializer = ListSerializer(FocusRecord.serializer())

    fun encode(records: List<FocusRecord>): String = json.encodeToString(serializer, records)

    /** Só a ausência de histórico vira vazio. Conteúdo inválido bloqueia a leitura e a edição. */
    fun decode(text: String?): List<FocusRecord> =
        if (text.isNullOrBlank()) {
            emptyList()
        } else {
            try {
                json.decodeFromString(serializer, text)
            } catch (failure: SerializationException) {
                throw IOException("Histórico de foco inválido.", failure)
            } catch (failure: IllegalArgumentException) {
                throw IOException("Histórico de foco inválido.", failure)
            }
        }
}

/** Lê uma versão completa do arquivo sem alterar as chaves nem recuperar por gravação. */
internal fun readFocusSnapshot(prefs: Preferences): FocusSnapshot {
    val config = PomodoroConfig(
        focusMinutes = prefs[FocusMinutesKey]?.takeIf(Pomodoro::isValidMinutes) ?: 25,
        shortBreakMinutes = prefs[ShortBreakKey]?.takeIf(Pomodoro::isValidMinutes) ?: 5,
        longBreakMinutes = prefs[LongBreakKey]?.takeIf(Pomodoro::isValidMinutes) ?: 15,
        longBreaks = prefs[LongBreaksKey] ?: true,
    )
    val duration = prefs[DurationKey]?.takeIf(Pomodoro::isValidMinutes) ?: config.focusMinutes
    val state = PomodoroState(
        phase = FocusPhase.entries.firstOrNull { it.name == prefs[PhaseKey] } ?: FocusPhase.Focus,
        completed = (prefs[CompletedKey] ?: 0).coerceAtLeast(0),
        durationMinutes = duration,
        running = prefs[RunningKey] ?: false,
        deadlineMs = prefs[DeadlineKey],
        remainingMs = (prefs[RemainingKey] ?: duration * 60_000L).coerceIn(0, duration * 60_000L),
    )
    // Estado inconsistente (rodando sem prazo) volta a pausado em vez de quebrar o relógio.
    val safe = if (state.running && state.deadlineMs == null) state.copy(running = false) else state
    val stopwatchRunning = (prefs[StopwatchRunningKey] ?: false) && prefs[StopwatchStartedKey] != null
    return FocusSnapshot(
        pomodoro = safe,
        config = config,
        mode = FocusMode.entries.firstOrNull { it.name == prefs[ModeKey] } ?: FocusMode.Timer,
        stopwatch = StopwatchState(
            running = stopwatchRunning,
            startedAtMs = if (stopwatchRunning) prefs[StopwatchStartedKey] else null,
            accumulatedMs = (prefs[StopwatchAccumulatedKey] ?: 0L).coerceAtLeast(0),
        ),
        records = FocusRecordsCodec.decode(prefs[RecordsKey]),
    )
}

interface FocusPersistence {
    suspend fun load(): FocusSnapshot
    suspend fun save(snapshot: FocusSnapshot)
}

/**
 * Cache do Foco neste aparelho. A sessão de Foco pertence à conta e vai sincronizar quando o login
 * entrar; até lá isto é só o que impede perder o relógio ao fechar o app. Não é "sincronização".
 */
class FocusStore(private val context: Context) : FocusPersistence {
    override suspend fun load(): FocusSnapshot = readFocusSnapshot(context.focusStore.data.first())

    override suspend fun save(snapshot: FocusSnapshot) {
        context.focusStore.edit {
            val state = snapshot.pomodoro
            it[PhaseKey] = state.phase.name
            it[CompletedKey] = state.completed
            it[DurationKey] = state.durationMinutes
            it[RunningKey] = state.running
            if (state.deadlineMs != null) it[DeadlineKey] = state.deadlineMs else it.remove(DeadlineKey)
            it[RemainingKey] = state.remainingMs
            it[FocusMinutesKey] = snapshot.config.focusMinutes
            it[ShortBreakKey] = snapshot.config.shortBreakMinutes
            it[LongBreakKey] = snapshot.config.longBreakMinutes
            it[LongBreaksKey] = snapshot.config.longBreaks
            it[ModeKey] = snapshot.mode.name
            it[StopwatchRunningKey] = snapshot.stopwatch.running
            if (snapshot.stopwatch.startedAtMs != null) it[StopwatchStartedKey] = snapshot.stopwatch.startedAtMs else it.remove(StopwatchStartedKey)
            it[StopwatchAccumulatedKey] = snapshot.stopwatch.accumulatedMs
            it[RecordsKey] = FocusRecordsCodec.encode(snapshot.records)
        }
    }
}
