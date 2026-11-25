package olenastudy.app.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.ZoneId
import kotlinx.coroutines.delay
import olenastudy.app.R
import olenastudy.app.data.focus.FocusMode
import olenastudy.app.data.focus.FocusSnapshot
import olenastudy.app.domain.focus.FocusFlower
import olenastudy.app.domain.focus.FocusPhase
import olenastudy.app.domain.focus.FocusWeek
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.focus.FocusController
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.PaperDigits

private val FocusChoices = listOf(15, 25, 45, 60)

private val TomatoStages = intArrayOf(
    R.drawable.art_tomato_0, R.drawable.art_tomato_1, R.drawable.art_tomato_2, R.drawable.art_tomato_3, R.drawable.art_tomato_4,
    R.drawable.art_tomato_5, R.drawable.art_tomato_6, R.drawable.art_tomato_7, R.drawable.art_tomato_8,
)

/** "25:00" ou "1:05:00". Arredonda para cima: com 0,4 s sobrando ainda mostra 00:01. */
fun formatClock(remainingMs: Long): String {
    val total = (remainingMs.coerceAtLeast(0) + 999) / 1000
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
}

/** Relógio do cronômetro, sempre "HH:MM:SS" como no site. Aqui o tempo sobe: arredonda para baixo. */
fun formatStopwatch(elapsedMs: Long): String {
    val total = elapsedMs.coerceAtLeast(0) / 1000
    return "%02d:%02d:%02d".format(total / 3600, (total % 3600) / 60, total % 60)
}

/** Ações da tela do Foco. A tela de verdade liga isto ao controlador; os testes de imagem usam vazias. */
data class FocusActions(
    val onMode: () -> Unit = {},
    val onPrimary: () -> Unit = {},
    val onStopwatchReset: () -> Unit = {},
    val onStopwatchFinish: () -> Unit = {},
    val onSkip: () -> Unit = {},
    val onRestartPhase: () -> Unit = {},
    val onPomodoroFinish: () -> Unit = {},
    val onFocusMinutes: (Int) -> Unit = {},
)

@Composable
fun FocusScreen(controller: FocusController) {
    val snapshot by controller.snapshot.collectAsStateWithLifecycle()
    val pomodoro = snapshot.pomodoro
    val stopwatch = snapshot.stopwatch
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val anyRunning = pomodoro.running || stopwatch.running

    // Relógio da tela: só corre enquanto algo está rodando. No Pomodoro, ao vencer avisa o controlador.
    LaunchedEffect(pomodoro.running, pomodoro.deadlineMs, stopwatch.running) {
        while (anyRunning) {
            now = System.currentTimeMillis()
            if (pomodoro.isExpiredAt(now)) {
                controller.onExpired()
                break
            }
            delay(200)
        }
        now = System.currentTimeMillis()
    }

    // Android 13 pede permissão para mostrar o aviso de fim de fase. Pedimos ao iniciar o Pomodoro.
    val askNotifications = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    val isTimer = snapshot.mode == FocusMode.Timer
    FocusContent(
        snapshot = snapshot,
        nowMs = now,
        actions = FocusActions(
            onMode = { controller.setMode(if (isTimer) FocusMode.Pomodoro else FocusMode.Timer) },
            onPrimary = {
                if (!isTimer && !pomodoro.running && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
                if (isTimer) controller.toggleStopwatch() else controller.togglePomodoro()
            },
            onStopwatchReset = controller::resetStopwatch,
            onStopwatchFinish = controller::finishStopwatch,
            onSkip = controller::skip,
            onRestartPhase = controller::restartPhase,
            onPomodoroFinish = controller::finishPomodoro,
            onFocusMinutes = controller::setFocusMinutes,
        ),
    )
}

/** Conteúdo do Foco, sem estado: recebe o retrato do relógio e a hora, e devolve ações. */
@Composable
fun FocusContent(snapshot: FocusSnapshot, nowMs: Long, actions: FocusActions) {
    val pomodoro = snapshot.pomodoro
    val stopwatch = snapshot.stopwatch
    val now = nowMs
    val anyRunning = pomodoro.running || stopwatch.running
    val colors = OlenaTheme.colors
    val isTimer = snapshot.mode == FocusMode.Timer
    val elapsedMs = stopwatch.elapsedAt(now)
    val flower = FocusFlower.state(snapshot.records, now, ZoneId.systemDefault(), if (isTimer && stopwatch.running) elapsedMs / 60000.0 else 0.0)
    val locked = anyRunning || stopwatch.accumulatedMs > 0

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = stringResource(if (isTimer) R.string.focus_mode_timer else R.string.focus_mode_pomodoro).uppercase(),
            style = MaterialTheme.typography.titleMedium,
            letterSpacing = 1.5.sp,
            color = colors.violet,
            modifier = Modifier.padding(top = 8.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            ModeArrow(R.drawable.art_arrow_prev, enabled = !locked, description = stringResource(R.string.focus_mode_previous)) {
                actions.onMode()
            }
            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                if (isTimer) {
                    val dark = colors.isDark
                    val rose =
                        when {
                            flower.wilted && !dark -> R.drawable.art_rose_wilted
                            flower.wilted -> R.drawable.art_rose_wilted_dark
                            flower.progress >= 0.5 -> if (dark) R.drawable.art_rose_bloom_dark else R.drawable.art_rose_bloom
                            else -> if (dark) R.drawable.art_rose_sleeping_dark else R.drawable.art_rose_sleeping
                        }
                    Image(painterResource(rose), null, Modifier.height(220.dp))
                } else {
                    val fraction = pomodoro.remainingAt(now).toDouble() / (pomodoro.durationMinutes * 60_000.0)
                    val stage = if (pomodoro.phase == FocusPhase.Focus) Pomodoro.tomatoStage(fraction) else 0
                    // Como no site: o relógio fica sobre a minhoca colada no tomate.
                    Box(Modifier.size(width = 280.dp, height = 252.dp), contentAlignment = Alignment.Center) {
                        Image(painterResource(TomatoStages[stage]), null, Modifier.fillMaxSize())
                        Box(Modifier.align(Alignment.Center).offset(y = 20.dp).width(235.dp).aspectRatio(320f / 120f), contentAlignment = Alignment.Center) {
                            Image(painterResource(R.drawable.art_pomodoro_worm), null, Modifier.fillMaxSize())
                            PaperDigits(formatClock(pomodoro.remainingAt(now)), digitHeight = 40.dp, modifier = Modifier.padding(end = 38.dp))
                        }
                    }
                }
            }
            ModeArrow(R.drawable.art_arrow_next, enabled = !locked, description = stringResource(R.string.focus_mode_next)) {
                actions.onMode()
            }
        }
        if (isTimer) {
            Text(stringResource(R.string.focus_flower_label).uppercase(), style = MaterialTheme.typography.titleMedium, letterSpacing = 1.5.sp, color = colors.violet)
            val message =
                when {
                    !flower.hasHistory && !stopwatch.running -> R.string.focus_flower_sleeping
                    flower.wilted && flower.minutesToday == 0 -> R.string.focus_flower_missed
                    flower.minutesToday > 0 -> R.string.focus_flower_safe
                    else -> R.string.focus_flower_start
                }
            CenterTitle(stringResource(message))
            Text(
                "${minOf(FocusFlower.FULL_BLOOM_MINUTES, (flower.minutesToday + elapsedMs / 60000.0).toInt())}/${FocusFlower.FULL_BLOOM_MINUTES} " +
                    stringResource(R.string.focus_flower_progress),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
            )
            PaperDigits(formatStopwatch(elapsedMs), digitHeight = 64.dp, modifier = Modifier.padding(top = 4.dp))
        } else {
            if (pomodoro.phase != FocusPhase.Focus) {
                Text(
                    stringResource(if (pomodoro.phase == FocusPhase.LongBreak) R.string.focus_phase_long_break else R.string.focus_phase_short_break).uppercase(),
                    style = MaterialTheme.typography.titleMedium,
                    letterSpacing = 1.5.sp,
                    color = colors.violet,
                )
                CenterTitle(
                    stringResource(
                        if (pomodoro.phase == FocusPhase.LongBreak) R.string.focus_long_break_text else R.string.focus_short_break_text,
                    ),
                )
            }
            PomodoroWeek(snapshot, now)
        }

        val label =
            if (isTimer) {
                if (stopwatch.running) R.string.focus_pause else if (stopwatch.accumulatedMs > 0) R.string.focus_resume else R.string.focus_start
            } else {
                if (pomodoro.running) R.string.focus_pause else R.string.focus_start
            }
        if (isTimer) {
            PaperButton(text = stringResource(label), onClick = actions.onPrimary, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                PaperButton(stringResource(R.string.focus_restart), actions.onStopwatchReset, Modifier.weight(1f), PaperButtonStyle.Quiet)
                PaperButton(
                    stringResource(R.string.focus_finish),
                    actions.onStopwatchFinish,
                    Modifier.weight(1f),
                    if (olenastudy.app.domain.focus.Stopwatch.canFinish(elapsedMs)) PaperButtonStyle.Accent else PaperButtonStyle.Quiet,
                )
            }
        } else {
            // Como no site: Começar com play, reiniciar só com ícone e Encerrar e registrar.
            val doneMs = pomodoro.durationMinutes * 60_000L - pomodoro.remainingAt(now)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                PaperButton(
                    text = stringResource(label),
                    onClick = actions.onPrimary,
                    modifier = Modifier.weight(1f),
                    leading = { PlayGlyph() },
                )
                PaperButton(
                    text = "",
                    onClick = actions.onRestartPhase,
                    leading = {
                        Image(painterResource(R.drawable.art_icon_reset_light), stringResource(R.string.focus_restart), Modifier.size(26.dp))
                    },
                )
                PaperButton(
                    text = stringResource(R.string.focus_finish_pomodoro),
                    onClick = actions.onPomodoroFinish,
                    modifier = Modifier.weight(1.45f),
                    enabled = doneMs >= 1000,
                )
            }
        }
        if (!isTimer && !pomodoro.running && pomodoro.phase == FocusPhase.Focus) {
            Text(stringResource(R.string.focus_length_title), style = MaterialTheme.typography.titleMedium, color = colors.text)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                FocusChoices.forEach { minutes ->
                    PaperButton(
                        text = stringResource(R.string.focus_minutes_short, minutes),
                        onClick = { actions.onFocusMinutes(minutes) },
                        modifier = Modifier.weight(1f),
                        style = PaperButtonStyle.Quiet,
                        selected = snapshot.config.focusMinutes == minutes,
                    )
                }
            }
        }
    }
}

/** Triângulo de play de papel: branco com a faceta clara, como o ícone do botão Começar. */
@Composable
private fun PlayGlyph() {
    androidx.compose.foundation.Canvas(Modifier.size(22.dp)) {
        val body = androidx.compose.ui.graphics.Path().apply {
            moveTo(size.width * 0.12f, size.height * 0.06f)
            lineTo(size.width * 0.94f, size.height * 0.5f)
            lineTo(size.width * 0.12f, size.height * 0.94f)
            close()
        }
        drawPath(body, Color(0xFFFFF9EF))
        val facet = androidx.compose.ui.graphics.Path().apply {
            moveTo(size.width * 0.12f, size.height * 0.06f)
            lineTo(size.width * 0.94f, size.height * 0.5f)
            lineTo(size.width * 0.12f, size.height * 0.5f)
            close()
        }
        drawPath(facet, Color(0xFFE6DAF8))
    }
}

@Composable
private fun CenterTitle(text: String) {
    Text(
        text = text,
        fontFamily = ManropeFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        textAlign = TextAlign.Center,
        color = OlenaTheme.colors.text,
        modifier = Modifier.padding(horizontal = 12.dp),
    )
}

@Composable
private fun ModeArrow(@DrawableRes art: Int, enabled: Boolean, description: String, onClick: () -> Unit) {
    Image(
        painter = painterResource(art),
        contentDescription = description,
        modifier = Modifier
            .width(44.dp)
            .height(52.dp)
            .size(44.dp, 52.dp)
            .let { if (enabled) it.clickable(onClick = onClick) else it }
            .padding(0.dp),
        alpha = if (enabled) 1f else 0.35f,
    )
}

/** Semana de tomates e resumo das durações, como no Pomodoro do site. */
@Composable
private fun PomodoroWeek(snapshot: FocusSnapshot, nowMs: Long) {
    val colors = OlenaTheme.colors
    val zone = ZoneId.systemDefault()
    val today = java.time.Instant.ofEpochMilli(nowMs).atZone(zone).toLocalDate()
    val active = FocusWeek.activeDays(snapshot.records, zone)
    val config = snapshot.config
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
        Text(stringResource(R.string.focus_week_title), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = colors.text)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            FocusWeek.days(today).forEachIndexed { index, day ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val res =
                        when {
                            day in active -> if (colors.isDark) R.drawable.art_streak_on_dark else R.drawable.art_streak_on
                            else -> if (colors.isDark) R.drawable.art_streak_off_dark else R.drawable.art_streak_off
                        }
                    Image(painterResource(res), null, Modifier.size(width = 36.dp, height = 40.dp))
                    Text(FocusWeek.LABELS[index].toString(), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = colors.muted)
                }
            }
        }
        val summary =
            stringResource(R.string.focus_summary_study_break, FocusWeek.formatDuration(config.focusMinutes), FocusWeek.formatDuration(config.shortBreakMinutes)) +
                if (config.longBreaks) {
                    " · " + stringResource(R.string.focus_summary_long_break, FocusWeek.formatDuration(config.longBreakMinutes))
                } else {
                    stringResource(R.string.focus_summary_no_long_break)
                }
        Text(summary, style = MaterialTheme.typography.bodyMedium, color = colors.text, textAlign = TextAlign.Center)
    }
}
