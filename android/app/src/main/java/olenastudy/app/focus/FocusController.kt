package olenastudy.app.focus

import android.content.Context
import java.io.IOException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import olenastudy.app.data.focus.FocusMode
import olenastudy.app.data.focus.FocusSnapshot
import olenastudy.app.data.focus.FocusStore
import olenastudy.app.data.focus.FocusPersistence
import olenastudy.app.data.ReadState
import olenastudy.app.domain.focus.FocusPhase
import olenastudy.app.domain.focus.FocusRecord
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.Stopwatch
import olenastudy.app.domain.focus.StopwatchState

/**
 * Liga os relógios ao armazenamento e aos alarmes. Nenhuma ação usa valores padrão enquanto
 * a primeira leitura estiver pendente ou com falha.
 */
class FocusController internal constructor(
    private val store: FocusPersistence,
    private val scope: CoroutineScope,
    private val clock: () -> Long,
    private val syncAlarm: (FocusSnapshot) -> Unit,
) {
    constructor(context: Context, scope: CoroutineScope, clock: () -> Long = System::currentTimeMillis) : this(
        FocusStore(context), scope, clock,
        { saved ->
            val deadline = saved.pomodoro.deadlineMs
            if (saved.pomodoro.running && deadline != null) FocusAlarm.schedule(context, deadline, saved.pomodoro.phase) else FocusAlarm.cancel(context)
        },
    )

    private val _state = MutableStateFlow<ReadState<FocusSnapshot>>(ReadState.Loading)
    val state: StateFlow<ReadState<FocusSnapshot>> = _state.asStateFlow()

    init { read() }

    fun retryRead() {
        if (_state.value == ReadState.Failed) read()
    }

    private fun read() {
        _state.value = ReadState.Loading
        scope.launch {
            val saved = try {
                store.load()
            } catch (_: IOException) {
                _state.value = ReadState.Failed
                return@launch
            }
            _state.value = ReadState.Ready(saved)
            // O app ficou fechado e o prazo venceu: a fase já acabou, entra na próxima, pausada.
            if (saved.pomodoro.isExpiredAt(clock())) onExpired() else syncAlarm(saved)
        }
    }

    private fun loaded(): FocusSnapshot? = (_state.value as? ReadState.Ready)?.value

    // ---- Modo ----

    /** Como no site, só troca de modo com tudo parado e zerado. */
    fun setMode(mode: FocusMode) {
        val s = loaded() ?: return
        if (s.mode == mode || s.pomodoro.running || s.stopwatch.running || s.stopwatch.accumulatedMs > 0) return
        commit(s.copy(mode = mode))
    }

    // ---- Cronômetro ----

    fun toggleStopwatch() {
        val s = loaded() ?: return
        val now = clock()
        commit(s.copy(stopwatch = if (s.stopwatch.running) Stopwatch.pause(s.stopwatch, now) else Stopwatch.start(s.stopwatch, now)))
    }

    fun resetStopwatch() {
        val s = loaded() ?: return
        commit(s.copy(stopwatch = StopwatchState()))
    }

    /** Concluir: grava os minutos como o site e zera. */
    fun finishStopwatch() {
        val s = loaded() ?: return
        val now = clock()
        val elapsed = s.stopwatch.elapsedAt(now)
        if (!Stopwatch.canFinish(elapsed)) return
        val record = FocusRecord(now, Stopwatch.recordedMinutes(elapsed), "timer")
        commit(s.copy(stopwatch = StopwatchState(), records = s.records + record))
    }

    // ---- Pomodoro ----

    fun togglePomodoro() {
        val s = loaded() ?: return
        val now = clock()
        commit(s.copy(pomodoro = if (s.pomodoro.running) Pomodoro.pause(s.pomodoro, now) else Pomodoro.start(s.pomodoro, now)))
    }

    /** Chamado pela tela quando o prazo vence com o app aberto, e na abertura se já venceu. */
    fun onExpired() {
        val s = loaded() ?: return
        if (s.pomodoro.isExpiredAt(clock())) advance(s, recordFocus = true)
    }

    /** "Pular": vai para a próxima fase. Se era foco, o tempo feito vira uma sessão, como "concluir". */
    fun skip() {
        val s = loaded() ?: return
        advance(s, recordFocus = s.pomodoro.phase == FocusPhase.Focus && s.pomodoro.remainingAt(clock()) < s.pomodoro.durationMinutes * 60_000L)
    }

    /** "Encerrar e registrar": grava o tempo de foco feito até agora, como o site, e reinicia a fase. */
    fun finishPomodoro() {
        val s = loaded() ?: return
        val now = clock()
        val state = s.pomodoro
        val doneMs = state.durationMinutes * 60_000L - state.remainingAt(now)
        if (doneMs < 1000) return
        val records =
            if (state.phase == FocusPhase.Focus) s.records + FocusRecord(now, Stopwatch.recordedMinutes(doneMs), "pomodoro") else s.records
        commit(s.copy(pomodoro = Pomodoro.restartPhase(state), records = records))
    }

    /** Configurações > Estudo e foco: troca as durações do Pomodoro. Um relógio parado na fase atual já passa a usar o valor novo. */
    fun setConfig(config: PomodoroConfig) {
        if (!Pomodoro.isValidMinutes(config.focusMinutes) || !Pomodoro.isValidMinutes(config.shortBreakMinutes) || !Pomodoro.isValidMinutes(config.longBreakMinutes)) return
        val s = loaded() ?: return
        val minutes =
            when (s.pomodoro.phase) {
                FocusPhase.Focus -> config.focusMinutes
                FocusPhase.ShortBreak -> config.shortBreakMinutes
                FocusPhase.LongBreak -> config.longBreakMinutes
            }
        val untouched = !s.pomodoro.running && s.pomodoro.remainingMs == s.pomodoro.durationMinutes * 60_000L
        val state = if (untouched) s.pomodoro.copy(durationMinutes = minutes, remainingMs = minutes * 60_000L) else s.pomodoro
        commit(s.copy(config = config, pomodoro = state))
    }

    fun restartPhase() {
        val s = loaded() ?: return
        commit(s.copy(pomodoro = Pomodoro.restartPhase(s.pomodoro)))
    }

    fun setFocusMinutes(minutes: Int) {
        if (!Pomodoro.isValidMinutes(minutes)) return
        val s = loaded() ?: return
        val config = s.config.copy(focusMinutes = minutes)
        // Trocar a duração só vale na fase de foco parada: não mexe num relógio que está correndo.
        val state =
            if (!s.pomodoro.running && s.pomodoro.phase == FocusPhase.Focus) {
                s.pomodoro.copy(durationMinutes = minutes, remainingMs = minutes * 60_000L)
            } else {
                s.pomodoro
            }
        commit(s.copy(config = config, pomodoro = state))
    }

    private fun advance(s: FocusSnapshot, recordFocus: Boolean) {
        val now = clock()
        val state = s.pomodoro
        val doneMs = state.durationMinutes * 60_000L - state.remainingAt(now)
        val records =
            if (recordFocus && state.phase == FocusPhase.Focus && doneMs >= 1000) {
                s.records + FocusRecord(now, Stopwatch.recordedMinutes(doneMs), "pomodoro")
            } else {
                s.records
            }
        commit(s.copy(pomodoro = Pomodoro.advance(state, s.config), records = records))
    }

    private fun commit(next: FocusSnapshot) {
        if (loaded() == null) return
        _state.value = ReadState.Ready(next)
        scope.launch { store.save(next) }
        syncAlarm(next)
    }

}
