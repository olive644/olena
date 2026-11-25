package olenastudy.app.domain.focus

import java.time.Instant
import java.time.ZoneId
import kotlinx.serialization.Serializable

/** Uma sessão de foco concluída. Mesmo formato lógico de `focusSessions` do site. */
@Serializable
data class FocusRecord(
    val completedAtMs: Long,
    val durationMinutes: Int,
    /** "timer" (cronômetro) ou "pomodoro". Só o cronômetro cuida da flor. */
    val mode: String = "timer",
)

/** Estado da flor de foco, igual a `focusFlowerState` (src/domain/focus-flower.ts). */
data class FlowerState(
    val minutesToday: Int,
    val hasHistory: Boolean,
    val wilted: Boolean,
    val progress: Double,
)

object FocusFlower {
    const val FULL_BLOOM_MINUTES = 60
    private const val DAY_MS = 86_400_000L

    fun state(records: List<FocusRecord>, nowMs: Long, zone: ZoneId, liveMinutes: Double = 0.0): FlowerState {
        fun dayOf(ms: Long) = Instant.ofEpochMilli(ms).atZone(zone).toLocalDate()
        val today = dayOf(nowMs)
        val timers = records.filter { it.mode != "pomodoro" && it.durationMinutes > 0 && it.completedAtMs <= nowMs }
        val lastAt = timers.maxOfOrNull { it.completedAtMs }
        val minutesToday = timers.filter { dayOf(it.completedAtMs) == today }.sumOf { it.durationMinutes }
        val live = liveMinutes.coerceAtLeast(0.0)
        return FlowerState(
            minutesToday = minutesToday,
            hasHistory = lastAt != null,
            wilted = liveMinutes <= 0 && (lastAt == null || nowMs - lastAt >= DAY_MS),
            progress = ((minutesToday + live) / FULL_BLOOM_MINUTES).coerceAtMost(1.0),
        )
    }
}

/** Cronômetro (modo "Cronômetro" do Foco): conta para cima e guarda o tempo ao pausar. */
data class StopwatchState(
    val running: Boolean = false,
    val startedAtMs: Long? = null,
    val accumulatedMs: Long = 0,
) {
    fun elapsedAt(nowMs: Long): Long =
        if (running && startedAtMs != null) accumulatedMs + (nowMs - startedAtMs).coerceAtLeast(0) else accumulatedMs
}

object Stopwatch {
    fun start(state: StopwatchState, nowMs: Long) = if (state.running) state else state.copy(running = true, startedAtMs = nowMs)

    fun pause(state: StopwatchState, nowMs: Long) =
        if (!state.running) state else StopwatchState(running = false, startedAtMs = null, accumulatedMs = state.elapsedAt(nowMs))

    /** Minutos gravados ao concluir: `Math.max(1, Math.round(segundos / 60))` do site. */
    fun recordedMinutes(elapsedMs: Long): Int = maxOf(1, Math.round(elapsedMs / 1000.0 / 60.0).toInt())

    /** O site só deixa concluir com pelo menos 1 segundo de tempo. */
    fun canFinish(elapsedMs: Long): Boolean = elapsedMs >= 1000
}
