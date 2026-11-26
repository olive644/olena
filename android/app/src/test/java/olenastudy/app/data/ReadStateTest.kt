package olenastudy.app.data

import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class ReadStateTest {
    @Test fun anEmptyResponseIsOnlyEmptyAfterTheReadCompletes() = runBlocking {
        assertEquals(listOf(ReadState.Loading, ReadState.Ready(emptyList<String>())), flowOf(emptyList<String>()).asReadState().toList())
    }

    @Test fun anIoFailureNeverBecomesAnEmptyResponse() = runBlocking {
        val source = flow<List<String>> { throw IOException("private path") }
        assertEquals(listOf(ReadState.Loading, ReadState.Failed), source.asReadState().toList())
    }

    @Test fun recollectingRetriesTheReadWithoutReplacingSavedData() = runBlocking {
        var attempts = 0
        val source = flow {
            if (++attempts == 1) throw IOException()
            emit(listOf("saved task"))
        }.asReadState()
        assertEquals(listOf(ReadState.Loading, ReadState.Failed), source.toList())
        assertEquals(listOf(ReadState.Loading, ReadState.Ready(listOf("saved task"))), source.toList())
    }

    @Test fun aLaterReadFailureDoesNotEmitEmptyData() = runBlocking {
        val source = flow {
            emit(listOf("saved task"))
            throw IOException()
        }
        assertEquals(listOf(ReadState.Loading, ReadState.Ready(listOf("saved task")), ReadState.Failed), source.asReadState().toList())
    }

    @Test fun cancellationIsNotReportedAsAReadFailure() {
        assertThrows(CancellationException::class.java) {
            runBlocking { flow<String> { throw CancellationException() }.asReadState().toList() }
        }
    }

    @Test fun programmerErrorsAreNotHiddenAsRecoverableReadFailures() {
        assertThrows(IllegalStateException::class.java) {
            runBlocking { flow<String> { error("unexpected") }.asReadState().toList() }
        }
    }
}
