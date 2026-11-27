package olenastudy.app.domain.practice

import kotlinx.serialization.Serializable
import kotlin.math.max
import kotlin.math.min

@Serializable
data class MathMissed(val question: MasteryQuestion, val choice: Double?)

/** Rodada visitante, recuperável pela Activity, sem gravar progresso fora de uma conta. */
@Serializable
data class MathArcadeRound(
    val course: String = "foundations",
    val progress: MathMasteryProgress = MathMasteryProgress(),
    val stage: String = "ready",
    val lives: Int = 3,
    val points: Int = 0,
    val streak: Int = 0,
    val reserve: Double = 60.0,
    val elapsed: Double = 0.0,
    val stageElapsed: Double = 0.0,
    val at: Long = 0,
    val wallAt: Long = 0,
    val paused: Boolean = false,
    val last: MasteryQuestion? = null,
    val lastChoice: Double? = null,
    val lastCorrect: Boolean = false,
    val lastTimedOut: Boolean = false,
    val milestone: Boolean = false,
    val completed: Boolean = false,
    val missed: List<MathMissed> = emptyList(),
    val reviewIndex: Int = 0,
) {
    fun question(bank: MathQuestionBank): MasteryQuestion = MathMastery.next(course, progress, bank)

    fun remaining(bank: MathQuestionBank): Double = min(reserve, question(bank).entry.budget - elapsed).coerceAtLeast(0.0)

    fun start(now: Long, wall: Long): MathArcadeRound = copy(stage = "countdown", stageElapsed = 0.0, at = now, wallAt = wall)

    fun recover(): MathArcadeRound = copy(paused = stage in setOf("playing", "countdown", "feedback") || paused, at = 0, wallAt = 0)

    fun resume(now: Long, wall: Long): MathArcadeRound = copy(paused = false, at = now, wallAt = wall)

    fun pause(now: Long, wall: Long, bank: MathQuestionBank): MathArcadeRound =
        if (stage in setOf("playing", "countdown", "feedback")) tick(now, wall, bank).copy(paused = true) else this

    fun tick(now: Long, wall: Long, bank: MathQuestionBank): MathArcadeRound {
        if (paused || stage !in setOf("playing", "countdown", "feedback")) return this
        val seconds = max(0L, max(now - at, wall - wallAt)) / 1000.0
        val next = copy(at = now, wallAt = wall, stageElapsed = stageElapsed + seconds)
        return when (stage) {
            "countdown" -> if (next.stageElapsed >= 3) next.copy(stage = "playing", elapsed = 0.0, stageElapsed = 0.0) else next
            "feedback" -> if (next.stageElapsed < if (lastCorrect) 0.65 else 1.3) next else next.copy(
                stage = when {
                    milestone -> "milestone"
                    lives == 0 || completed -> if (missed.isEmpty()) "results" else "review"
                    else -> "playing"
                }, elapsed = 0.0, stageElapsed = 0.0,
            )
            else -> {
                val active = next.copy(elapsed = elapsed + seconds, reserve = max(0.0, reserve - seconds))
                if (active.remaining(bank) <= 0) active.assess(null, bank) else active
            }
        }
    }

    /** Atualiza o relógio antes de aceitar o toque; a primeira resposta fecha a pergunta. */
    fun answer(choice: Double, now: Long, wall: Long, bank: MathQuestionBank): MathArcadeRound {
        if (paused || stage != "playing" || choice !in question(bank).choices) return this
        val active = tick(now, wall, bank)
        return if (active.stage == "playing") active.assess(choice, bank) else active
    }

    private fun assess(choice: Double?, bank: MathQuestionBank): MathArcadeRound {
        val q = question(bank)
        val result = MathMastery.assess(course, progress, q, choice ?: q.choices.first { it != q.entry.answer }, elapsed.coerceIn(0.0, 120.0), streak, bank, timedOut = choice == null)
        val total = points + result.points
        val updated = result.progress.copy(best = max(result.progress.best, total))
        val enteringFinal = MathMastery.next(course, updated, bank).phase == "final" && q.phase != "final"
        val bankSeconds = when {
            reserve <= 0 || enteringFinal -> max(60.0, reserve)
            result.timedOut -> max(0.0, reserve - 4).let { if (it == 0.0) 60.0 else it }
            result.correct -> min(90.0, reserve + if (result.fast) 3 else 2)
            else -> reserve
        }
        return copy(progress = updated, points = total, streak = result.streak, lives = lives - if (result.correct) 0 else 1,
            reserve = bankSeconds, stage = "feedback", stageElapsed = 0.0,
            last = q, lastChoice = choice, lastCorrect = result.correct, lastTimedOut = result.timedOut, milestone = result.milestone,
            completed = completed || result.milestone && updated.confirmed == 63,
            missed = if (result.correct) missed else missed + MathMissed(q, choice))
    }

    fun continueMilestone(now: Long, wall: Long): MathArcadeRound = if (stage != "milestone") this else copy(
        stage = if (completed || lives == 0) { if (missed.isEmpty()) "results" else "review" } else "playing",
        at = now, wallAt = wall, milestone = false,
    )

    fun reviewNext(): MathArcadeRound = if (stage != "review") this else
        if (reviewIndex + 1 >= missed.size) copy(stage = "results") else copy(reviewIndex = reviewIndex + 1)

    fun retry(): MathArcadeRound = MathArcadeRound(course = course, progress = progress)
}
