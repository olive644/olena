package olenastudy.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.glance.appwidget.updateAll
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.launch
import olenastudy.app.R
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.domain.agenda.Agenda
import olenastudy.app.domain.agenda.Recurrence
import olenastudy.app.domain.agenda.StudyEvent
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.PaperCard
import olenastudy.app.widget.AgendaWidget

private val DateLabel = DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", Locale("pt", "BR"))
private val Durations = listOf(15, 30, 45, 60, 90)
private val Repeats = listOf(Recurrence.none, Recurrence.daily, Recurrence.weekly, Recurrence.monthly)

fun formatMinutesOfDay(minutes: Int): String = "%02d:%02d".format(minutes / 60, minutes % 60)

@Composable
fun AgendaScreen(repository: AgendaRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val events by repository.events.collectAsStateWithLifecycle(initialValue = emptyList())
    var dateText by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var creating by rememberSaveable { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<StudyEvent?>(null) }
    val date = LocalDate.parse(dateText)
    val today = events.let { Agenda.eventsOn(it, dateText) }

    fun changed(block: suspend () -> Unit) {
        scope.launch {
            block()
            AgendaWidget().updateAll(context)
        }
    }

    ScreenScaffold(R.string.screen_planner_title) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            PaperButton("‹", { dateText = date.minusDays(1).toString() }, Modifier.weight(1f), PaperButtonStyle.Quiet)
            PaperButton(stringResource(R.string.agenda_today), { dateText = LocalDate.now().toString() }, Modifier.weight(2f), PaperButtonStyle.Quiet)
            PaperButton("›", { dateText = date.plusDays(1).toString() }, Modifier.weight(1f), PaperButtonStyle.Quiet)
        }
        Text(
            text = date.format(DateLabel).replaceFirstChar { it.uppercase() },
            style = MaterialTheme.typography.titleLarge,
            color = OlenaTheme.colors.text,
        )
        if (today.isEmpty()) {
            PaperCard(Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.agenda_empty), style = MaterialTheme.typography.bodyLarge, color = OlenaTheme.colors.muted)
            }
        }
        today.forEach { event ->
            PaperCard(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(event.title, style = MaterialTheme.typography.titleMedium, color = OlenaTheme.colors.text)
                    Text(
                        "${event.time} · ${event.durationMinutes} min" +
                            if (event.recurrenceFrequency != Recurrence.none) " · " + stringResource(repeatLabel(event.recurrenceFrequency)) else "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = OlenaTheme.colors.muted,
                    )
                    PaperButton(stringResource(R.string.agenda_delete), { deleting = event }, Modifier.fillMaxWidth(), PaperButtonStyle.Quiet)
                }
            }
        }
        PaperButton(stringResource(R.string.agenda_new), { creating = true }, Modifier.fillMaxWidth())
        Text(
            stringResource(R.string.agenda_local_note),
            style = MaterialTheme.typography.bodyMedium,
            color = OlenaTheme.colors.muted,
        )
    }

    if (creating) {
        NewEventDialog(
            date = dateText,
            onDismiss = { creating = false },
            onSave = { event ->
                creating = false
                changed { repository.add(event) }
            },
        )
    }
    deleting?.let { event ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(stringResource(R.string.agenda_delete_title)) },
            text = { Text(stringResource(R.string.agenda_delete_text, event.title)) },
            confirmButton = {
                PaperButton(stringResource(R.string.agenda_delete), {
                    deleting = null
                    changed { repository.remove(event.id) }
                })
            },
            dismissButton = { PaperButton(stringResource(R.string.agenda_cancel), { deleting = null }, style = PaperButtonStyle.Quiet) },
        )
    }
}

@Composable
private fun NewEventDialog(date: String, onDismiss: () -> Unit, onSave: (StudyEvent) -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    var minutesOfDay by remember { mutableIntStateOf(9 * 60) }
    var duration by remember { mutableIntStateOf(30) }
    var repeat by remember { mutableStateOf(Recurrence.none) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.agenda_new)) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it.take(120) },
                    label = { Text(stringResource(R.string.agenda_field_title)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Text(stringResource(R.string.agenda_field_time), style = MaterialTheme.typography.labelLarge)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    PaperButton("−", { minutesOfDay = (minutesOfDay - 15 + 1440) % 1440 }, Modifier.weight(1f), PaperButtonStyle.Quiet)
                    PaperButton(formatMinutesOfDay(minutesOfDay), {}, Modifier.weight(2f), PaperButtonStyle.Quiet, selected = true)
                    PaperButton("+", { minutesOfDay = (minutesOfDay + 15) % 1440 }, Modifier.weight(1f), PaperButtonStyle.Quiet)
                }
                Text(stringResource(R.string.agenda_field_duration), style = MaterialTheme.typography.labelLarge)
                Chips(Durations, duration, { stringResource(R.string.focus_minutes_short, it) }) { duration = it }
                Text(stringResource(R.string.agenda_field_repeat), style = MaterialTheme.typography.labelLarge)
                Chips(Repeats, repeat, { stringResource(repeatLabel(it)) }) { repeat = it }
            }
        },
        confirmButton = {
            PaperButton(stringResource(R.string.agenda_save), {
                val name = title.trim()
                if (name.isNotEmpty()) {
                    onSave(
                        StudyEvent(
                            id = UUID.randomUUID().toString(),
                            title = name,
                            date = date,
                            time = formatMinutesOfDay(minutesOfDay),
                            durationMinutes = duration,
                            recurrenceFrequency = repeat,
                        ),
                    )
                }
            })
        },
        dismissButton = { PaperButton(stringResource(R.string.agenda_cancel), onDismiss, style = PaperButtonStyle.Quiet) },
    )
}

@Composable
private fun <T> Chips(items: List<T>, selected: T, label: @Composable (T) -> String, onSelect: (T) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        items.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { item ->
                    PaperButton(label(item), { onSelect(item) }, Modifier.weight(1f), PaperButtonStyle.Quiet, selected = item == selected)
                }
                repeat(3 - row.size) { androidx.compose.foundation.layout.Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

private fun repeatLabel(recurrence: Recurrence): Int =
    when (recurrence) {
        Recurrence.none -> R.string.agenda_repeat_none
        Recurrence.daily -> R.string.agenda_repeat_daily
        Recurrence.weekly -> R.string.agenda_repeat_weekly
        Recurrence.monthly -> R.string.agenda_repeat_monthly
        Recurrence.yearly -> R.string.agenda_repeat_yearly
    }
