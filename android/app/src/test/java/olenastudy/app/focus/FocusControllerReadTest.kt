package olenastudy.app.focus

import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import olenastudy.app.data.ReadState
import olenastudy.app.data.focus.FocusMode
import olenastudy.app.data.focus.FocusPersistence
import olenastudy.app.data.focus.FocusSnapshot
import olenastudy.app.domain.focus.FocusPhase
import olenastudy.app.domain.focus.FocusRecord
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.StopwatchState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class FocusControllerReadTest {
    private val now = 1_000_000L
    private val saved = FocusSnapshot(
        Pomodoro.initial(PomodoroConfig(focusMinutes = 50)), PomodoroConfig(focusMinutes = 50),
        FocusMode.Timer, StopwatchState(accumulatedMs = 60_000), listOf(FocusRecord(100, 15)),
    )

    private class Store(private val read: suspend () -> FocusSnapshot) : FocusPersistence {
        var reads = 0
        val writes = mutableListOf<FocusSnapshot>()
        override suspend fun load(): FocusSnapshot {
            reads++
            return read()
        }
        override suspend fun save(snapshot: FocusSnapshot) { writes += snapshot }
    }

    private fun tryEveryAction(controller: FocusController) {
        controller.setMode(FocusMode.Pomodoro)
        controller.toggleStopwatch()
        controller.resetStopwatch()
        controller.finishStopwatch()
        controller.togglePomodoro()
        controller.onExpired()
        controller.skip()
        controller.finishPomodoro()
        controller.setConfig(PomodoroConfig(focusMinutes = 45))
        controller.restartPhase()
        controller.setFocusMinutes(15)
    }

    @Test fun pendingReadBlocksEveryMutationAndDoesNotExposeDefaultHistory() = runBlocking {
        val gate = CompletableDeferred<FocusSnapshot>()
        val store = Store { gate.await() }
        val alarms = mutableListOf<FocusSnapshot>()
        val controller = FocusController(store, this, { now }, alarms::add)
        yield()
        tryEveryAction(controller)
        yield()
        assertEquals(ReadState.Loading, controller.state.value)
        assertEquals(emptyList<FocusSnapshot>(), store.writes)
        assertEquals(emptyList<FocusSnapshot>(), alarms)
        gate.complete(saved)
        yield()
        assertEquals(ReadState.Ready(saved), controller.state.value)
        assertEquals(listOf(saved), alarms)
        assertEquals(emptyList<FocusSnapshot>(), store.writes)
    }

    @Test fun readFailureBlocksActionsAndRetryLoadsTheSavedHistoryWithoutWritingDefaults() = runBlocking {
        var fail = true
        val store = Store { if (fail) throw IOException("private path") else saved }
        val alarms = mutableListOf<FocusSnapshot>()
        val controller = FocusController(store, this, { now }, alarms::add)
        yield()
        assertEquals(ReadState.Failed, controller.state.value)
        tryEveryAction(controller)
        yield()
        assertEquals(emptyList<FocusSnapshot>(), store.writes)
        assertEquals(emptyList<FocusSnapshot>(), alarms)
        fail = false
        controller.retryRead()
        controller.retryRead()
        assertEquals(ReadState.Loading, controller.state.value)
        yield()
        assertEquals(ReadState.Ready(saved), controller.state.value)
        assertEquals(2, store.reads)
        assertEquals(emptyList<FocusSnapshot>(), store.writes)
        controller.retryRead()
        yield()
        assertEquals(2, store.reads)
    }

    @Test fun actionsAfterRecoveryPreservePreviouslyCompletedRecords() = runBlocking {
        val store = Store { saved }
        val controller = FocusController(store, this, { now }, {})
        yield()
        controller.finishStopwatch()
        yield()
        val next = (controller.state.value as ReadState.Ready).value
        assertEquals(saved.records + FocusRecord(now, 1), next.records)
        assertEquals(StopwatchState(), next.stopwatch)
        assertEquals(listOf(next), store.writes)
    }

    @Test fun recoveryKeepsAPausedSessionPausedAndDoesNotSaveItAgain() = runBlocking {
        val store = Store { saved }
        val controller = FocusController(store, this, { now }, {})
        yield()
        val recovered = (controller.state.value as ReadState.Ready).value
        assertFalse(recovered.pomodoro.running)
        assertFalse(recovered.stopwatch.running)
        assertEquals(saved, recovered)
        assertEquals(emptyList<FocusSnapshot>(), store.writes)
    }

    @Test fun recoveryOfTheSameDeviceKeepsTheExistingStopwatchStartTime() = runBlocking {
        val active = saved.copy(stopwatch = StopwatchState(true, now - 10_000, 60_000))
        val controller = FocusController(Store { active }, this, { now }, {})
        yield()
        val recovered = (controller.state.value as ReadState.Ready).value
        assertEquals(active, recovered)
        assertEquals(70_000L, recovered.stopwatch.elapsedAt(now))
    }

    @Test fun anExpiredPhaseAddsOneRecordAndKeepsOlderRecords() = runBlocking {
        val expired = saved.copy(pomodoro = Pomodoro.initial().copy(running = true, deadlineMs = now - 1))
        val store = Store { expired }
        val controller = FocusController(store, this, { now }, {})
        yield()
        controller.onExpired()
        yield()
        val next = (controller.state.value as ReadState.Ready).value
        assertEquals(FocusPhase.ShortBreak, next.pomodoro.phase)
        assertFalse(next.pomodoro.running)
        assertEquals(saved.records + FocusRecord(now, 25, "pomodoro"), next.records)
        assertEquals(listOf(next), store.writes)
    }

    @Test fun pausedPomodoroCannotSwitchModeOrWriteAnotherSnapshot() = runBlocking {
        val paused = saved.copy(
            mode = FocusMode.Pomodoro,
            stopwatch = StopwatchState(),
            pomodoro = Pomodoro.initial().copy(remainingMs = 1490_000),
        )
        val store = Store { paused }
        val controller = FocusController(store, this, { now }, {})
        yield()
        controller.setMode(FocusMode.Timer)
        yield()
        assertEquals(ReadState.Ready(paused), controller.state.value)
        assertEquals(emptyList<FocusSnapshot>(), store.writes)
        controller.restartPhase()
        yield()
        controller.setMode(FocusMode.Timer)
        yield()
        assertEquals(FocusMode.Timer, (controller.state.value as ReadState.Ready).value.mode)
        assertEquals(paused.records, (controller.state.value as ReadState.Ready).value.records)
    }
}
