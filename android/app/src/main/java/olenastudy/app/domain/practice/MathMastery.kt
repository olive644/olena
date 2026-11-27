package olenastudy.app.domain.practice

import java.math.BigDecimal
import java.math.RoundingMode
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable data class MathRetry(val seed: Int, val due: Int)
@Serializable data class MathRecovery(val seed: Int, val kind: String, val due: Int, val updated: Int, val resolved: Boolean)
@Serializable data class MathFinal(val level: Int, val slots: List<Int>, val answered: Int = 0, val correct: Int = 0)

/** Formato lógico v5 da web; ainda não é um adaptador de sincronização de conta. */
@Serializable
data class MathMasteryProgress(
    val level: Int = 0, val mastery: Int = 0, val correct: Int = 0, val best: Int = 0,
    val mastered: Int = 0, val solved: List<Int> = List(6) { 0 }, val seen: List<Int> = List(6) { 0 },
    val extraSolved: List<Int> = List(6) { 0 }, val extraSeen: List<Int> = List(6) { 0 },
    val attempts: Int = 0, val recent: List<Int> = emptyList(), val retry: List<MathRetry> = emptyList(),
    val confirmed: Int = 0, val finalSeen: List<Int> = List(6) { 0 },
    @SerialName("final") val finalRound: MathFinal? = null,
    val recovery: List<MathRecovery> = emptyList(), val cooldown: Int = 0, val errors: Int = 0,
)

data class MathCompletion(val counts: List<Int>, val mastered: Int, val level: Int, val percent: Int)
data class MathAssessment(
    val progress: MathMasteryProgress, val correct: Boolean, val timedOut: Boolean, val fast: Boolean,
    val points: Int, val streak: Int, val milestone: Boolean, val finalOutcome: String?,
)

/** Portabilidade de math-challenge e math-mastery, conferida por vetores produzidos pela web. */
object MathMastery {
    fun challengeCompletion(p: MathMasteryProgress): MathCompletion {
        val counts = p.solved.mapIndexed { level, mask ->
            val extra = p.extraSolved[level]
            val total = Integer.bitCount(mask) + Integer.bitCount(extra)
            val breadth = (0..7).all { format -> ((if (format < 4) mask else extra) ushr (format % 4 * 6)) and 63 != 0 }
            val hard = (0..47).count { index -> index % 6 >= 4 && (if (index < 24) mask else extra) and (1 shl (index % 24)) != 0 }
            val previous = p.mastered and (1 shl level) != 0 || Integer.bitCount(mask) >= 20
            minOf(if (previous || breadth && hard >= 4) 20 else 19, total)
        }
        val mastered = counts.foldIndexed(0) { level, mask, count -> mask or if (count >= 20) 1 shl level else 0 }
        return MathCompletion(counts, mastered, counts.indexOfFirst { it < 20 }.let { if (it < 0) 5 else it }, counts.sum() * 100 / 120)
    }

    fun completion(p: MathMasteryProgress): MathCompletion {
        val counts = challengeCompletion(p).counts.mapIndexed { level, count -> if (p.confirmed and (1 shl level) != 0) 20 else minOf(19, count) }
        return MathCompletion(counts, p.confirmed, (0..5).firstOrNull { p.confirmed and (1 shl it) == 0 } ?: 5, counts.sum() * 100 / 120)
    }

    fun has(p: MathMasteryProgress, seed: Int, solved: Boolean = false): Boolean {
        val level = (seed - 1) / 48; val index = (seed - 1) % 48
        val masks = if (solved) { if (index < 24) p.solved else p.extraSolved } else { if (index < 24) p.seen else p.extraSeen }
        return masks[level] and (1 shl (index % 24)) != 0
    }

    private fun normalize(p: MathMasteryProgress): MathMasteryProgress {
        val c = challengeCompletion(p)
        return p.copy(level = c.level, mastered = c.mastered, mastery = minOf(5, c.counts[c.level]),
            retry = p.retry.filter { (it.seed - 1) / 48 == c.level && !has(p, it.seed, true) })
    }

    fun pendingFinal(p: MathMasteryProgress): MathFinal? {
        p.finalRound?.let { return it }
        val level = completion(p).level
        if (p.confirmed == 63 || p.cooldown > 0 || p.mastered and (1 shl level) == 0) return null
        val available = (0..23).filter { p.finalSeen[level] and (1 shl it) == 0 }.toMutableList()
        val slots = mutableListOf<Int>()
        repeat(5) { i ->
            val format = (level + Integer.bitCount(p.finalSeen[level]) / 5 + i) % 4
            val slot = available.firstOrNull { it / 6 == format } ?: (0..23).first { it !in slots && it / 6 == format }
            slots += slot; available.remove(slot)
        }
        return MathFinal(level, slots)
    }

    private fun settle(p: MathMasteryProgress): MathMasteryProgress {
        val f = p.finalRound
        val result = if (f?.answered == 31) {
            val passed = Integer.bitCount(f.correct) >= 4
            p.copy(finalRound = null, cooldown = if (passed) 0 else 4, confirmed = p.confirmed or if (passed) 1 shl f.level else 0)
        } else p
        val level = completion(result).level
        return result.copy(finalRound = result.finalRound?.takeIf { result.confirmed and (1 shl it.level) == 0 },
            recovery = result.recovery.filter { (it.seed - 1) / 48 == level && result.confirmed != 63 })
    }

    private fun round2(value: Double): Double = BigDecimal(value).setScale(2, RoundingMode.HALF_UP).toDouble()

    fun mistake(course: String, q: MathBankEntry, choice: Double, timedOut: Boolean): String {
        if (timedOut) return "time"
        val level = if (q.seed > 288) (q.seed - 289) / 24 else (q.seed - 1) / 48
        if (course == "foundations" && level == 1 && q.format in listOf(0, 6)) {
            val match = Regex("^(\\d+) − (\\d+)(?:\\. Resultado\\?)?$").matchEntire(q.expression)
            if (match != null && match.groupValues[1].toInt() % 10 < match.groupValues[2].toInt() % 10 && choice == q.answer + 10) return "regrouping"
        }
        if (course == "foundations" && (level < 2 && q.format == 1 || level in 2..3 && q.format == 2)) return "inverse"
        if (q.answer != 0.0 && choice == -q.answer) return "sign"
        if (q.answer != 0.0 && listOf(q.answer * 2, q.answer / 2, q.answer * 10, q.answer / 10).any { round2(it) == choice }) return "scale"
        if (course == "advanced" && level == 4) return "order"
        return "rule"
    }

    private data class Due(val recovery: MathRecovery, val question: MasteryQuestion)

    private fun due(course: String, p: MathMasteryProgress, bank: MathQuestionBank): Due? = p.recovery
        .filter { !it.resolved && it.due <= p.attempts }.sortedWith(compareBy<MathRecovery> { it.due }.thenBy { it.seed })
        .firstNotNullOfOrNull { r ->
            val level = (r.seed - 1) / 48; val format = ((r.seed - 1) % 48) / 6
            val candidate = (0..5).map { bank.question(course, level * 48 + format * 6 + it + 1, p.attempts + 1) }
                .filter { it.entry.seed != r.seed && it.entry.seed !in p.recent }
                .filter { q -> r.kind == "time" || q.choices.any { it != q.entry.answer && mistake(course, q.entry, it, false) == r.kind } }
                .sortedWith(compareBy<MasteryQuestion> { if (has(p, it.entry.seed)) 1 else 0 }.thenBy { it.entry.seed }).firstOrNull()
            candidate?.let { Due(r, it) }
        }

    fun next(course: String, p: MathMasteryProgress, bank: MathQuestionBank): MasteryQuestion {
        pendingFinal(p)?.let { f ->
            val position = Integer.bitCount(f.answered)
            return bank.question(course, 289 + f.level * 24 + f.slots[position], p.attempts + 1).copy(phase = "final", position = position)
        }
        if (p.attempts % 4 == 0 || p.cooldown > 0) due(course, p, bank)?.let { return it.question.copy(phase = "recovery") }
        val level = completion(p).level
        val context = p.copy(level = level, retry = emptyList())
        val seeds = (level * 48 + 1..level * 48 + 48).toList()
        val reviews = seeds.filter { has(context, it, true) && it !in p.recent }
        val unseen = seeds.filter { !has(context, it) && it !in p.recent }
        val unsolved = seeds.filter { !has(context, it, true) && it !in p.recent }
        val seed = if (p.attempts > 0 && p.attempts % 8 == 0 && reviews.isNotEmpty()) {
            reviews[(p.attempts / 8 - 1) % reviews.size]
        } else {
            val available = unseen.ifEmpty { unsolved.ifEmpty { seeds.filter { it !in p.recent } } }
            val desired = if (unseen.isNotEmpty()) (Integer.bitCount(p.seen[level]) + Integer.bitCount(p.extraSeen[level])) % 8 else p.attempts % 8
            val order = listOf(0, 2, 4, 1, 3, 5)
            available.sortedWith(compareBy<Int> { (((it - 1) % 48 / 6) - desired + 8) % 8 }
                .thenBy { order.indexOf((it - 1) % 6) }.thenBy { it }).first()
        }
        return bank.question(course, seed, p.attempts + 1)
    }

    fun assess(course: String, p: MathMasteryProgress, q: MasteryQuestion, choice: Double, elapsed: Double, streak: Int, bank: MathQuestionBank, timedOut: Boolean = false): MathAssessment {
        require(q == next(course, p, bank) && choice in q.choices && elapsed.isFinite() && elapsed in 0.0..120.0 && streak in 0..100000)
        val expired = timedOut || elapsed >= q.entry.budget.toDouble() / q.entry.drain
        val correct = !expired && choice == q.entry.answer
        val fast = !expired && elapsed <= q.entry.budget.toDouble() / q.entry.drain * 0.32
        val nextStreak = if (correct) streak + 1 else 0
        val points = if (correct) 10 + completion(p).level * 4 + (if (fast) 6 else 0) + minOf(5, nextStreak) * 2 else 0
        val f = if (q.phase == "final") requireNotNull(pendingFinal(p)) else null
        var finalOutcome: String? = null
        var updated: MathMasteryProgress
        if (f != null) {
            val position = Integer.bitCount(f.answered)
            val finalSeen = p.finalSeen.toMutableList().apply { this[f.level] = this[f.level] or (1 shl f.slots[position]) }
            val nextFinal = f.copy(answered = f.answered or (1 shl position), correct = f.correct or if (correct) 1 shl position else 0)
            updated = p.copy(finalSeen = finalSeen, attempts = minOf(100000, p.attempts + 1), correct = minOf(100000, p.correct + if (correct) 1 else 0), finalRound = nextFinal)
            if (nextFinal.answered == 31) finalOutcome = if (Integer.bitCount(nextFinal.correct) >= 4) "passed" else "retry"
        } else {
            val level = completion(p).level; val index = (q.entry.seed - 1) % 48; val bit = 1 shl (index % 24)
            val solved = p.solved.toMutableList(); val seen = p.seen.toMutableList()
            val extraSolved = p.extraSolved.toMutableList(); val extraSeen = p.extraSeen.toMutableList()
            val seenMasks = if (index < 24) seen else extraSeen; seenMasks[level] = seenMasks[level] or bit
            if (correct) { val solvedMasks = if (index < 24) solved else extraSolved; solvedMasks[level] = solvedMasks[level] or bit }
            val retry = emptyList<MathRetry>().toMutableList()
            if (!correct) retry += MathRetry(q.entry.seed, minOf(100004, p.attempts + 5))
            updated = normalize(p.copy(level = level, solved = solved, seen = seen, extraSolved = extraSolved, extraSeen = extraSeen,
                attempts = minOf(100000, p.attempts + 1), recent = (p.recent + q.entry.seed).takeLast(4), retry = retry,
                correct = minOf(100000, p.correct + if (correct) 1 else 0), cooldown = maxOf(0, p.cooldown - 1)))
        }
        val target = if (q.phase == "recovery") due(course, p, bank)?.recovery else null
        var recovery = p.recovery.map { r -> if (r.seed == target?.seed) r.copy(resolved = correct, updated = updated.attempts, due = minOf(100004, updated.attempts + 4)) else r }
        if (!correct) {
            val level = if (q.entry.seed > 288) (q.entry.seed - 289) / 24 else (q.entry.seed - 1) / 48
            val index = if (q.entry.seed > 288) 24 + (q.entry.seed - 289) % 24 else (q.entry.seed - 1) % 48
            val seed = level * 48 + index + 1
            recovery = listOf(MathRecovery(seed, mistake(course, q.entry, choice, expired), minOf(100004, updated.attempts + 4), updated.attempts, false)) + recovery.filter { it.seed != seed }
        }
        updated = settle(updated.copy(recovery = recovery.take(6)))
        return MathAssessment(updated, correct, expired, fast, points, nextStreak, updated.confirmed != p.confirmed, finalOutcome)
    }
}
