package olenastudy.app.data.focus

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import olenastudy.app.domain.focus.FocusPhase
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.PomodoroState

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

/**
 * Cache do Foco neste aparelho. A sessão de Foco pertence à conta e vai sincronizar quando o login
 * entrar; até lá isto é só o que impede perder o relógio ao fechar o app. Não é "sincronização".
 */
class FocusStore(private val context: Context) {
    suspend fun load(): Pair<PomodoroState, PomodoroConfig> {
        val prefs = context.focusStore.data.first()
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
        return safe to config
    }

    suspend fun save(state: PomodoroState, config: PomodoroConfig) {
        context.focusStore.edit {
            it[PhaseKey] = state.phase.name
            it[CompletedKey] = state.completed
            it[DurationKey] = state.durationMinutes
            it[RunningKey] = state.running
            if (state.deadlineMs != null) it[DeadlineKey] = state.deadlineMs else it.remove(DeadlineKey)
            it[RemainingKey] = state.remainingMs
            it[FocusMinutesKey] = config.focusMinutes
            it[ShortBreakKey] = config.shortBreakMinutes
            it[LongBreakKey] = config.longBreakMinutes
            it[LongBreaksKey] = config.longBreaks
        }
    }
}
