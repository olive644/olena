package olenastudy.app.data

import java.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart

/** Ausência de uma resposta não significa ausência de dados. */
sealed interface ReadState<out T> {
    data object Loading : ReadState<Nothing>
    data class Ready<T>(val value: T) : ReadState<T>
    data object Failed : ReadState<Nothing>
}

/** Uma nova coleta tenta ler novamente. Falhas não escrevem nem substituem o conteúdo salvo. */
fun <T> Flow<T>.asReadState(): Flow<ReadState<T>> =
    map<T, ReadState<T>> { ReadState.Ready(it) }
        .onStart { emit(ReadState.Loading) }
        .catch { failure ->
            if (failure is IOException) emit(ReadState.Failed) else throw failure
        }
