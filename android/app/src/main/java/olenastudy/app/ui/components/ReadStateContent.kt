package olenastudy.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.flow.Flow
import olenastudy.app.R
import olenastudy.app.data.ReadState
import olenastudy.app.data.asReadState
import olenastudy.app.ui.OlenaTheme

class ReadResult<T>(val state: ReadState<T>, val retry: () -> Unit)

@Composable
fun <T> rememberReadState(source: Flow<T>): ReadResult<T> {
    var attempt by rememberSaveable { mutableIntStateOf(0) }
    val state = key(source, attempt) {
        val stream = remember { source.asReadState() }
        val value by stream.collectAsStateWithLifecycle(initialValue = ReadState.Loading)
        value
    }
    return ReadResult(state) { attempt++ }
}

/**
 * Mantém os estados saveable da tela durante erro e nova tentativa de leitura.
 * scrollStatus=false delega a rolagem da espera e do erro ao contêiner pai.
 */
@Composable
fun <T> ReadStateContent(
    state: ReadState<T>,
    onRetry: () -> Unit,
    loadingLabel: String,
    modifier: Modifier = Modifier,
    scrollStatus: Boolean = true,
    content: @Composable (T) -> Unit,
) {
    val holder = rememberSaveableStateHolder()
    when (state) {
        is ReadState.Ready -> holder.SaveableStateProvider("loaded-content") { content(state.value) }
        else -> Column(
            modifier = modifier.fillMaxSize().background(OlenaTheme.colors.page)
                .safeDrawingPadding()
                .then(if (scrollStatus) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        ) {
            if (state == ReadState.Loading) {
                HelenaLoading(loadingLabel)
            } else {
                PaperCard(Modifier.fillMaxWidth()) {
                    Column(
                        Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Text(stringResource(R.string.read_error_title), style = MaterialTheme.typography.titleLarge, color = OlenaTheme.colors.text)
                        Text(stringResource(R.string.read_error_body), style = MaterialTheme.typography.bodyLarge, color = OlenaTheme.colors.muted)
                        PaperButton(stringResource(R.string.read_retry), onClick = onRetry, style = PaperButtonStyle.Quiet)
                    }
                }
            }
        }
    }
}
