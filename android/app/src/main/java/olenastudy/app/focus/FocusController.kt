package olenastudy.app.focus

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import olenastudy.app.data.focus.FocusStore
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.PomodoroState

/**
 * Liga o relógio (puro) ao aparelho: guarda o estado, marca e cancela o alarme. Toda mudança
 * passa por `apply`, que salva primeiro e só então mexe no alarme.
 */
class FocusController(
    private val context: Context,
    private val scope: CoroutineScope,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val store = FocusStore(context)
    private val _state = MutableStateFlow(Pomodoro.initial())
    private val _config = MutableStateFlow(PomodoroConfig())
    private val _ready = MutableStateFlow(false)

    val state: StateFlow<PomodoroState> = _state.asStateFlow()
    val config: StateFlow<PomodoroConfig> = _config.asStateFlow()
    val ready: StateFlow<Boolean> = _ready.asStateFlow()

    init {
        scope.launch {
            val (saved, savedConfig) = store.load()
            _config.value = savedConfig
            _state.value = saved
            // O app ficou fechado e o prazo venceu: a fase já acabou, entra na próxima, pausada.
            if (saved.isExpiredAt(clock())) update(Pomodoro.advance(saved, savedConfig))
            _ready.value = true
        }
    }

    fun toggle() {
        val now = clock()
        val current = _state.value
        update(if (current.running) Pomodoro.pause(current, now) else Pomodoro.start(current, now))
    }

    /** Chamado pela tela quando o prazo vence com o app aberto. */
    fun onExpired() {
        val current = _state.value
        if (current.isExpiredAt(clock())) update(Pomodoro.advance(current, _config.value))
    }

    fun skip() = update(Pomodoro.advance(_state.value, _config.value))

    fun restartPhase() = update(Pomodoro.restartPhase(_state.value))

    fun setFocusMinutes(minutes: Int) {
        if (!Pomodoro.isValidMinutes(minutes)) return
        val config = _config.value.copy(focusMinutes = minutes)
        _config.value = config
        val current = _state.value
        // Trocar a duração só vale na fase de foco parada: não mexe num relógio que está correndo.
        val next =
            if (!current.running && current.phase == olenastudy.app.domain.focus.FocusPhase.Focus) {
                current.copy(durationMinutes = minutes, remainingMs = minutes * 60_000L)
            } else {
                current
            }
        update(next, config)
    }

    private fun update(next: PomodoroState, config: PomodoroConfig = _config.value) {
        _state.value = next
        scope.launch { store.save(next, config) }
        if (next.running && next.deadlineMs != null) {
            FocusAlarm.schedule(context, next.deadlineMs, next.phase)
        } else {
            FocusAlarm.cancel(context)
        }
    }
}
