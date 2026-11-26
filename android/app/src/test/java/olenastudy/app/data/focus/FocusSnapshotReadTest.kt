package olenastudy.app.data.focus

import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.preferencesOf
import androidx.datastore.preferences.core.stringPreferencesKey
import java.io.IOException
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.domain.focus.StopwatchState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class FocusSnapshotReadTest {
    @Test fun anEmptyFileOnlyUsesDefaultsAfterTheReadSucceeds() {
        assertEquals(
            FocusSnapshot(Pomodoro.initial(), PomodoroConfig(), FocusMode.Timer, StopwatchState(), emptyList()),
            readFocusSnapshot(emptyPreferences()),
        )
    }

    @Test fun aBrokenHistoryPreventsTheWholeSnapshotFromBeingEditable() {
        val prefs = preferencesOf(stringPreferencesKey("records_json") to "[{broken")
        assertThrows(IOException::class.java) { readFocusSnapshot(prefs) }
        assertEquals("[{broken", prefs[stringPreferencesKey("records_json")])
    }
}
