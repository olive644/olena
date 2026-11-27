package olenastudy.app.domain.practice

import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class MathArcadeRoundTest {
    private val bank = MathQuestionBank(Json.decodeFromString<MathBankFile>(requireNotNull(javaClass.classLoader?.getResourceAsStream("practice/math-bank.json")).bufferedReader().use { it.readText() }))

    private fun playing() = MathArcadeRound().start(1_000, 1_000).tick(4_000, 4_000, bank)

    @Test fun countdownAndFeedbackDoNotSpendQuestionTime() {
        val countdown = MathArcadeRound().start(1_000, 1_000).tick(3_900, 3_900, bank)
        assertEquals("countdown", countdown.stage)
        val active = countdown.tick(4_000, 4_000, bank)
        assertEquals(60.0, active.reserve, 0.0)
        val answered = active.answer(active.question(bank).entry.answer, 5_000, 5_000, bank)
        assertEquals(62.0, answered.reserve, 0.0)
        assertEquals(3, answered.lives)
        assertEquals("feedback", answered.tick(5_649, 5_649, bank).stage)
        val next = answered.tick(5_650, 5_650, bank)
        assertEquals("playing", next.stage)
        assertEquals(62.0, next.reserve, 0.0)
        assertEquals(0.0, next.elapsed, 0.0)
    }

    @Test fun repeatedAnswerAndDeadlineRaceAreScoredOnce() {
        val active = playing()
        val answer = active.question(bank).entry.answer
        val once = active.answer(answer, 4_100, 4_100, bank)
        assertEquals(once, once.answer(answer, 4_101, 4_101, bank))
        val timeout = active.answer(answer, 124_000, 124_000, bank)
        assertEquals(2, timeout.lives)
        assertEquals(0, timeout.points)
        assertTrue(timeout.lastTimedOut)
        assertEquals(1, timeout.progress.attempts)
        assertEquals(60.0, timeout.reserve, 0.0)
    }

    @Test fun clockUsesLargerWallOrMonotonicDeltaAndIgnoresBackwardsTime() {
        val active = playing()
        val forward = active.tick(4_200, 6_000, bank)
        assertEquals(2.0, forward.elapsed, 0.0)
        val back = active.tick(3_000, 3_000, bank)
        assertEquals(0.0, back.elapsed, 0.0)
    }

    @Test fun pauseAndActivityRecoveryRequireExplicitResume() {
        val paused = playing().pause(5_000, 5_000, bank)
        assertEquals(paused, paused.tick(90_000, 90_000, bank))
        val recovered = Json.decodeFromString<MathArcadeRound>(Json.encodeToString(playing())).recover()
        assertTrue(recovered.paused)
        assertEquals(recovered, recovered.tick(90_000, 90_000, bank))
        val resumed = recovered.resume(90_000, 90_000).tick(91_000, 91_000, bank)
        assertEquals(1.0, resumed.elapsed, 0.0)
    }

    @Test fun threeMistakesLeadToUntimedReviewThenResultsAndRetry() {
        var round = playing()
        var now = 4_000L
        repeat(3) {
            now += 100
            val q = round.question(bank)
            round = round.answer(q.choices.first { it != q.entry.answer }, now, now, bank)
            now += 1_300
            round = round.tick(now, now, bank)
        }
        assertEquals("review", round.stage)
        assertEquals(0, round.lives)
        assertEquals(3, round.missed.size)
        assertEquals(round, round.tick(now + 80_000, now + 80_000, bank))
        repeat(3) { round = round.reviewNext() }
        assertEquals("results", round.stage)
        val retry = round.retry()
        assertEquals(round.progress, retry.progress)
        assertEquals(3, retry.lives)
        assertEquals(0, retry.points)
        assertEquals(60.0, retry.reserve, 0.0)
        assertTrue(retry.missed.isEmpty())
    }

    @Test fun reserveCapsAtNinetyAndTimeoutPenalizesFourSeconds() {
        val active = playing().copy(reserve = 90.0)
        assertEquals(90.0, active.answer(active.question(bank).entry.answer, 4_100, 4_100, bank).reserve, 0.0)
        val limit = active.question(bank).entry.budget * 1_000L
        val timeout = active.tick(4_000 + limit, 4_000 + limit, bank)
        assertEquals(90.0 - limit / 1000.0 - 4, timeout.reserve, 0.0)
        assertEquals(null, timeout.missed.single().choice)
    }

    @Test fun completeGuestCourseConfirmsEveryTopicAndCanBePracticedAgain() {
        var round = playing()
        var now = 4_000L
        var milestones = 0
        var steps = 0
        while (round.stage != "results" && steps++ < 240) {
            now += 100
            round = round.answer(round.question(bank).entry.answer, now, now, bank)
            now += 650
            round = round.tick(now, now, bank)
            if (round.stage == "milestone") {
                milestones++
                val waiting = round.tick(now + 30_000, now + 30_000, bank)
                assertEquals(round, waiting)
                round = round.continueMilestone(now, now)
            }
        }
        assertEquals("results", round.stage)
        assertEquals(6, milestones)
        assertEquals(63, round.progress.confirmed)
        assertEquals(100, MathMastery.completion(round.progress).percent)
        val again = round.retry().start(now, now).tick(now + 3_000, now + 3_000, bank)
        val answer = again.answer(again.question(bank).entry.answer, now + 3_100, now + 3_100, bank)
        assertFalse(answer.completed)
        assertEquals("playing", answer.tick(now + 3_750, now + 3_750, bank).stage)
    }
}
