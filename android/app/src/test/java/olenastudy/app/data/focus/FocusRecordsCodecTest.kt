package olenastudy.app.data.focus

import java.io.IOException
import olenastudy.app.domain.focus.FocusRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class FocusRecordsCodecTest {
    @Test fun missingHistoryIsAnEmptyHistory() {
        assertEquals(emptyList<FocusRecord>(), FocusRecordsCodec.decode(null))
        assertEquals(emptyList<FocusRecord>(), FocusRecordsCodec.decode(""))
        assertEquals(emptyList<FocusRecord>(), FocusRecordsCodec.decode("[]"))
    }

    @Test fun aTruncatedHistoryIsNotAnEmptyHistory() {
        assertThrows(IOException::class.java) { FocusRecordsCodec.decode("[{\"completedAtMs\":123") }
    }

    @Test fun invalidRecordsDoNotSilentlyDiscardTheWholeHistory() {
        assertThrows(IOException::class.java) { FocusRecordsCodec.decode("[{\"completedAtMs\":123}]") }
    }

    @Test fun validHistoryKeepsTheExistingFormatAndIgnoresExtraFields() {
        val records = listOf(FocusRecord(123, 15), FocusRecord(456, 25, "pomodoro"))
        assertEquals(records, FocusRecordsCodec.decode(FocusRecordsCodec.encode(records)))
        assertEquals(listOf(FocusRecord(123, 15)), FocusRecordsCodec.decode("[{\"completedAtMs\":123,\"durationMinutes\":15,\"future\":true}]"))
    }
}
