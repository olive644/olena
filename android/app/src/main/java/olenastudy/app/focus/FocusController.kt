package olenastudy.app.focus

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import olenastudy.app.data.focus.FocusMode
import olenastudy.app.data.focus.FocusSnapshot
import olenastudy.app.data.focus.FocusStore
import olenastudy.app.domain.focus.FocusPhase
import olenastudy.app.domain.focus.FocusRecord
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.PomodoroState
import olenastudy.app.domain.focus.Stopwatch
import olenastudy.app.domain.focus.StopwatchState

/**
 * Liga os relógios (puros) ao aparelho: guarda o estado, marca e cancela o alarme. Toda mudança
 * passa por `commit`, que salva primeiro e só então mexe no alarme.
 */
class FocusController(
    private val context: Context,
    private val scope: CoroutineScope,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val store = FocusStore(context)
    private val _snapshot =
        MutableStateFlow(FocusSnapshot(Pomodoro.initial(), PomodoroConfig(), FocusMode.Timer, StopwatchState(), emptyList()))
    private val _ready = MutableStateFlow(false)

    val snapshot: StateFlow<FocusSnapshot> = _snapshot.asStateFlow()
    val ready: StateFlow<Boolean> = _ready.asStateFlow()

    init {
        scope.launch {
            val saved = store.load()
            _snapshot.value = saved
            // O app ficou fechado e o prazo venceu: a fase já acabou, entra na próxima, pausada.
            if (saved.pomodoro.isExpiredAt(clock())) onExpired() else syncAlarm(saved)
            _ready.value = true
        }
    }

    // ---- Modo ----

    /** Como no site, só troca de modo com tudo parado e zerado. */
    fun setMode(mode: FocusMode) {
        val s = _snapshot.value
        if (s.mode == mode || s.pomodoro.running || s.stopwatch.running || s.stopwatch.accumulatedMs > 0) return
        commit(s.copy(mode = mode))
    }

    // ---- Cronômetro ----

    fun toggleStopwatch() {
        val s = _snapshot.value
        val now = clock()
        commit(s.copy(stopwatch = if (s.stopwatch.running) Stopwatch.pause(s.stopwatch, now) else Stopwatch.start(s.stopwatch, now)))
    }

    fun resetStopwatch() = commit(_snapshot.value.copy(stopwatch = StopwatchState()))

    /** Concluir: grava os minutos como o site e zera. */
    fun finishStopwatch() {
        val s = _snapshot.value
        val now = clock()
        val elapsed = s.stopwatch.elapsedAt(now)
        if (!Stopwatch.canFinish(elapsed)) return
        val record = FocusRecord(now, Stopwatch.recordedMinutes(elapsed), "timer")
        commit(s.copy(stopwatch = StopwatchState(), records = s.records + record))
    }

    // ---- Pomodoro ----

    fun togglePomodoro() {
        val s = _snapshot.value
        val now = clock()
        commit(s.copy(pomodoro = if (s.pomodoro.running) Pomodoro.pause(s.pomodoro, now) else Pomodoro.start(s.pomodoro, now)))
    }

    /** Chamado pela tela quando o prazo vence com o app aberto, e na abertura se já venceu. */
    fun onExpired() {
        val s = _snapshot.value
        if (s.pomodoro.isExpiredAt(clock())) advance(s, recordFocus = true)
    }

    /** "Pular": vai para a próxima fase. Se era foco, o tempo feito vira uma sessão, como "concluir". */
    fun skip() {
        val s = _snapshot.value
        advance(s, recordFocus = s.pomodoro.phase == FocusPhase.Focus && s.pomodoro.remainingAt(clock()) < s.pomodoro.durationMinutes * 60_000L)
    }

    /** "Encerrar e registrar": grava o tempo de foco feito até agora, como o site, e reinicia a fase. */
    fun finishPomodoro() {
        val s = _snapshot.value
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
        val s = _snapshot.value
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

    fun restartPhase() = commit(_snapshot.value.copy(pomodoro = Pomodoro.restartPhase(_snapshot.value.pomodoro)))

    fun setFocusMinutes(minutes: Int) {
        if (!Pomodoro.isValidMinutes(minutes)) return
        val s = _snapshot.value
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
        _snapshot.value = next
        scope.launch { store.save(next) }
        syncAlarm(next)
    }

    private fun syncAlarm(s: FocusSnapshot) {
        val deadline = s.pomodoro.deadlineMs
        if (s.pomodoro.running && deadline != null) FocusAlarm.schedule(context, deadline, s.pomodoro.phase) else FocusAlarm.cancel(context)
    }
}
