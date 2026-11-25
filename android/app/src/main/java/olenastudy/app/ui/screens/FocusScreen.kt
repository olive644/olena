package olenastudy.app.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import olenastudy.app.R
import olenastudy.app.domain.focus.FocusPhase
import olenastudy.app.focus.FocusController
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.PaperCard

private val FocusChoices = listOf(15, 25, 45, 60)

/** "25:00" ou "1:05:00". Arredonda para cima: com 0,4 s sobrando ainda mostra 00:01. */
fun formatClock(remainingMs: Long): String {
    val total = (remainingMs.coerceAtLeast(0) + 999) / 1000
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
}

@Composable
fun FocusScreen(controller: FocusController) {
    val state by controller.state.collectAsStateWithLifecycle()
    val config by controller.config.collectAsStateWithLifecycle()
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }

    // Relógio da tela: só corre enquanto o foco está rodando. Ao vencer, avisa o controlador.
    LaunchedEffect(state.running, state.deadlineMs) {
        while (state.running) {
            now = System.currentTimeMillis()
            if (state.isExpiredAt(now)) {
                controller.onExpired()
                break
            }
            delay(250)
        }
        now = System.currentTimeMillis()
    }

    // Android 13 pede permissão para mostrar o aviso de fim de fase. Pedimos ao iniciar.
    val askNotifications =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { /* o relógio funciona sem */ }
    fun toggle() {
        if (!state.running && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        controller.toggle()
    }

    ScreenScaffold(R.string.screen_focus_title) {
        PaperCard(Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = stringResource(phaseLabel(state.phase)),
                    style = MaterialTheme.typography.titleMedium,
                    color = OlenaTheme.colors.violet,
                )
                Text(
                    text = formatClock(state.remainingAt(now)),
                    fontSize = 72.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = olenastudy.app.ui.ManropeFamily,
                    color = OlenaTheme.colors.text,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
                Text(
                    text = stringResource(R.string.focus_completed, state.completed),
                    style = MaterialTheme.typography.bodyMedium,
                    color = OlenaTheme.colors.muted,
                )
            }
        }
        PaperButton(
            text = stringResource(if (state.running) R.string.focus_pause else R.string.focus_start),
            onClick = ::toggle,
            modifier = Modifier.fillMaxWidth(),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            PaperButton(
                text = stringResource(R.string.focus_skip),
                onClick = controller::skip,
                modifier = Modifier.weight(1f),
                style = PaperButtonStyle.Quiet,
            )
            PaperButton(
                text = stringResource(R.string.focus_restart),
                onClick = controller::restartPhase,
                modifier = Modifier.weight(1f),
                style = PaperButtonStyle.Quiet,
            )
        }
        if (!state.running && state.phase == FocusPhase.Focus) {
            Text(
                text = stringResource(R.string.focus_length_title),
                style = MaterialTheme.typography.titleMedium,
                color = OlenaTheme.colors.text,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                FocusChoices.forEach { minutes ->
                    PaperButton(
                        text = stringResource(R.string.focus_minutes_short, minutes),
                        onClick = { controller.setFocusMinutes(minutes) },
                        modifier = Modifier.weight(1f),
                        style = PaperButtonStyle.Quiet,
                        selected = config.focusMinutes == minutes,
                    )
                }
            }
        }
    }
}

private fun phaseLabel(phase: FocusPhase): Int =
    when (phase) {
        FocusPhase.Focus -> R.string.focus_phase_focus
        FocusPhase.ShortBreak -> R.string.focus_phase_short_break
        FocusPhase.LongBreak -> R.string.focus_phase_long_break
    }
