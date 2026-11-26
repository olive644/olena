package olenastudy.app.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.appwidget.updateAll
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.launch
import olenastudy.app.R
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.data.agenda.TaskRepository
import olenastudy.app.domain.agenda.StudyTask
import olenastudy.app.domain.agenda.Tasks
import olenastudy.app.domain.agenda.Agenda
import olenastudy.app.domain.agenda.Recurrence
import olenastudy.app.domain.agenda.StudyEvent
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.PaperCard
import olenastudy.app.ui.components.paperPanel
import olenastudy.app.widget.AgendaWidget

private val PtBr = Locale("pt", "BR")
private val Durations = listOf(15, 30, 45, 60, 90)
private val Repeats = listOf(Recurrence.none, Recurrence.daily, Recurrence.weekly, Recurrence.monthly)

enum class AgendaView { Day, Week, Month, List }

fun formatMinutesOfDay(minutes: Int): String = "%02d:%02d".format(minutes / 60, minutes % 60)

/** "Novembro De 2026": o site capitaliza cada palavra do mês e do ano. */
fun monthTitle(date: LocalDate): String =
    date.format(DateTimeFormatter.ofPattern("MMMM 'de' yyyy", PtBr)).split(" ").joinToString(" ") { it.replaceFirstChar(Char::uppercase) }

/** "Quarta-Feira, 25 De Novembro", como o título do dia no site. */
fun dayTitle(date: LocalDate): String =
    date.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", PtBr)).split(" ").joinToString(" ") { part ->
        part.split("-").joinToString("-") { it.replaceFirstChar(Char::uppercase) }
    }

/** As 42 datas da grade do mês, começando na segunda-feira da semana do dia 1 (igual a `monthDates` do site). */
fun monthGrid(date: LocalDate): List<LocalDate> {
    val first = date.withDayOfMonth(1).with(DayOfWeek.MONDAY)
    return List(42) { first.plusDays(it.toLong()) }
}

@Composable
fun AgendaScreen(repository: AgendaRepository, taskRepository: TaskRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val events by repository.events.collectAsStateWithLifecycle(initialValue = emptyList())
    val tasks by taskRepository.tasks.collectAsStateWithLifecycle(initialValue = emptyList())
    fun changed(block: suspend () -> Unit) {
        scope.launch {
            block()
            AgendaWidget().updateAll(context)
        }
    }
    AgendaContent(
        events = events,
        tasks = tasks,
        today = LocalDate.now(),
        initialView = AgendaView.Month,
        onAdd = { event -> changed { repository.add(event) } },
        onRemove = { id -> changed { repository.remove(id) } },
        onAddTask = { task -> changed { taskRepository.add(task) } },
        onToggleTask = { id -> changed { taskRepository.toggle(id) } },
        onRemoveTask = { id -> changed { taskRepository.remove(id) } },
    )
}

/** Imagem estática para os testes de tela: mesmo conteúdo, sem banco. */
@Composable
fun AgendaPreview(events: List<StudyEvent>, today: LocalDate, view: AgendaView) =
    AgendaContent(events, emptyList(), today, view, onAdd = {}, onRemove = {}, onAddTask = {}, onToggleTask = {}, onRemoveTask = {})

/** Conteúdo da Agenda, sem acesso a dados: recebe os compromissos e devolve criar e excluir. */
@Composable
fun AgendaContent(
    events: List<StudyEvent>,
    tasks: List<StudyTask>,
    today: LocalDate,
    initialView: AgendaView,
    onAdd: (StudyEvent) -> Unit,
    onRemove: (String) -> Unit,
    onAddTask: (StudyTask) -> Unit,
    onToggleTask: (String) -> Unit,
    onRemoveTask: (String) -> Unit,
) {
    var dateText by rememberSaveable { mutableStateOf(today.toString()) }
    var viewName by rememberSaveable { mutableStateOf(initialView.name) }
    var query by rememberSaveable { mutableStateOf("") }
    var createKind by rememberSaveable { mutableStateOf<String?>(null) }
    var kindFilter by rememberSaveable { mutableStateOf("") }
    var deleting by remember { mutableStateOf<StudyEvent?>(null) }
    val date = LocalDate.parse(dateText)
    val view = AgendaView.valueOf(viewName)
    val colors = OlenaTheme.colors
    val byText = if (query.isBlank()) events else events.filter { it.title.contains(query.trim(), ignoreCase = true) }
    // Filtro por tipo, como no site: compromissos, estudos reservados ou tarefas.
    val shown = if (kindFilter.isEmpty()) byText else if (kindFilter == "task") emptyList() else byText.filter { it.kind == kindFilter }
    val visibleTasks = if (kindFilter.isEmpty() || kindFilter == "task") tasks else emptyList()

    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        // Painel de ferramentas: visões e busca, como no site.
        PaperCard(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(R.string.agenda_sync_caption), style = MaterialTheme.typography.bodyLarge, color = colors.text)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ViewTile(R.drawable.ic_agenda_day, stringResource(R.string.agenda_view_day), view == AgendaView.Day) { viewName = AgendaView.Day.name }
                    ViewTile(R.drawable.ic_agenda_week, stringResource(R.string.agenda_view_week), view == AgendaView.Week) { viewName = AgendaView.Week.name }
                    ViewTile(R.drawable.ic_agenda_month, stringResource(R.string.agenda_view_month), view == AgendaView.Month) { viewName = AgendaView.Month.name }
                    ViewTile(R.drawable.ic_agenda_list, stringResource(R.string.agenda_view_list), view == AgendaView.List) { viewName = AgendaView.List.name }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf("" to R.string.agenda_filter_all, "appointment" to R.string.agenda_filter_appointments, "study" to R.string.agenda_filter_study, "task" to R.string.agenda_filter_tasks).forEach { (value, label) ->
                        PaperButton(stringResource(label), { kindFilter = value }, Modifier.weight(1f), PaperButtonStyle.Quiet, selected = kindFilter == value)
                    }
                }
                Text(stringResource(R.string.agenda_search_title), style = MaterialTheme.typography.titleLarge, color = colors.text)
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it.take(80) },
                    placeholder = { Text(stringResource(R.string.agenda_search_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp),
                )
            }
        }

        when (view) {
            AgendaView.Month -> MonthPanel(date, today, shown, onPick = { dateText = it.toString() }, onToday = { dateText = today.toString() }, onMonth = { dateText = it.toString() })
            AgendaView.Week -> WeekPanel(date, shown, onPick = { dateText = it.toString() })
            AgendaView.List -> ListPanel(shown, today, onDelete = { deleting = it })
            AgendaView.Day -> Unit
        }

        if (view != AgendaView.List) {
            // Painel do dia: título, ação de criar e os compromissos do dia.
            PaperCard(Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(dayTitle(date), style = MaterialTheme.typography.headlineMedium, color = colors.text)
                    Box(Modifier.fillMaxWidth().height(2.dp).background(colors.yellow.copy(alpha = 0.55f)))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        PaperButton(stringResource(R.string.agenda_create_task), { createKind = "task" }, Modifier.weight(1f))
                        PaperButton(stringResource(R.string.agenda_reserve_study), { createKind = "study" }, Modifier.weight(1f))
                        PaperButton(stringResource(R.string.agenda_new), { createKind = "appointment" }, Modifier.weight(1f))
                    }
                    Tasks.dueOn(visibleTasks, dateText).forEach { task -> TaskRow(task, { onToggleTask(task.id) }, { onRemoveTask(task.id) }) }
                    val dayEvents = Agenda.eventsOn(shown, dateText)
                    if (dayEvents.isEmpty() && Tasks.dueOn(visibleTasks, dateText).isEmpty()) {
                        Text(stringResource(R.string.agenda_empty), style = MaterialTheme.typography.bodyLarge, color = colors.muted)
                    }
                    dayEvents.forEach { event -> EventRow(event) { deleting = event } }
                }
            }
        }
        Text(stringResource(R.string.agenda_local_note), style = MaterialTheme.typography.bodyMedium, color = colors.muted)
    }

    when (createKind) {
        "task" ->
            TaskDialog(
                date = dateText,
                onDismiss = { createKind = null },
                onSave = { task ->
                    createKind = null
                    onAddTask(task)
                },
            )
        "study", "appointment" ->
            NewEventDialog(
                date = dateText,
                kind = createKind!!,
                onDismiss = { createKind = null },
                onSave = { event ->
                    createKind = null
                    onAdd(event)
                },
            )
        else -> Unit
    }
    deleting?.let { event ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text(stringResource(R.string.agenda_delete_title)) },
            text = { Text(stringResource(R.string.agenda_delete_text, event.title)) },
            confirmButton = {
                PaperButton(stringResource(R.string.agenda_delete), {
                    deleting = null
                    onRemove(event.id)
                })
            },
            dismissButton = { PaperButton(stringResource(R.string.agenda_cancel), { deleting = null }, style = PaperButtonStyle.Quiet) },
        )
    }
}

@Composable
private fun ViewTile(@DrawableRes icon: Int, label: String, selected: Boolean, onClick: () -> Unit) {
    val colors = OlenaTheme.colors
    Column(
        modifier = Modifier
            .paperPanel(
                fill = if (colors.isDark) colors.surface else colors.page,
                base = if (colors.isDark) colors.lineStrong else Color(0xFFC8BAA4),
                facetLight = if (colors.isDark) colors.soft else Color(0xFFEEE5D5),
                facetDark = if (colors.isDark) colors.line else Color(0xFFE6DAC3),
                border = Color.Transparent,
                shape = RoundedCornerShape(topStart = 8.dp, topEnd = 14.dp, bottomEnd = 10.dp, bottomStart = 12.dp),
                radius = 12.dp,
                facet = 16.dp,
                shift = 4.dp,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(painterResource(icon), null, Modifier.size(34.dp))
        Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = colors.text, maxLines = 1)
        Box(Modifier.padding(top = 2.dp).width(30.dp).height(3.dp).background(if (selected) colors.yellow else Color.Transparent, RoundedCornerShape(2.dp)))
    }
}

@Composable
private fun MonthPanel(
    date: LocalDate,
    today: LocalDate,
    events: List<StudyEvent>,
    onPick: (LocalDate) -> Unit,
    onToday: () -> Unit,
    onMonth: (LocalDate) -> Unit,
) {
    val colors = OlenaTheme.colors
    PaperCard(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Image(painterResource(R.drawable.ic_agenda_month_art), null, Modifier.size(52.dp))
                Text(monthTitle(date), style = MaterialTheme.typography.titleMedium, color = colors.text, modifier = Modifier.weight(1f))
                PaperButton(stringResource(R.string.agenda_go_today), onToday)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                PaperButton("‹", { onMonth(date.minusMonths(1)) }, Modifier.weight(1f), PaperButtonStyle.Quiet)
                PaperButton("›", { onMonth(date.plusMonths(1)) }, Modifier.weight(1f), PaperButtonStyle.Quiet)
            }
            Row(Modifier.fillMaxWidth()) {
                listOf(R.string.weekday_mon, R.string.weekday_tue, R.string.weekday_wed, R.string.weekday_thu, R.string.weekday_fri, R.string.weekday_sat, R.string.weekday_sun).forEach {
                    Text(stringResource(it), Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.labelMedium, color = colors.muted)
                }
            }
            monthGrid(date).chunked(7).forEach { week ->
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                    week.forEach { day ->
                        DayCell(
                            day = day,
                            inMonth = day.month == date.month,
                            isToday = day == today,
                            selected = day == date,
                            hasEvents = Agenda.eventsOn(events, day.toString()).isNotEmpty(),
                            modifier = Modifier.weight(1f),
                            onClick = { onPick(day) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(day: LocalDate, inMonth: Boolean, isToday: Boolean, selected: Boolean, hasEvents: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val colors = OlenaTheme.colors
    val bg = when {
        selected || isToday -> Color(0xFF7433E0)
        else -> colors.soft
    }
    val ink = when {
        selected || isToday -> Color.White
        inMonth -> colors.text
        else -> colors.muted
    }
    Box(
        modifier = modifier
            .aspectRatio(0.92f)
            .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 11.dp, bottomEnd = 9.dp, bottomStart = 10.dp))
            .background(bg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            day.dayOfMonth.toString(),
            fontFamily = ManropeFamily,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 20.sp,
            color = ink,
        )
        if (hasEvents) {
            Box(Modifier.align(Alignment.TopEnd).padding(5.dp).size(8.dp).background(colors.yellow, RoundedCornerShape(2.dp)))
        }
    }
}

@Composable
private fun WeekPanel(date: LocalDate, events: List<StudyEvent>, onPick: (LocalDate) -> Unit) {
    val colors = OlenaTheme.colors
    val first = date.with(DayOfWeek.MONDAY)
    PaperCard(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(monthTitle(date), style = MaterialTheme.typography.titleMedium, color = colors.text)
            List(7) { first.plusDays(it.toLong()) }.forEach { day ->
                val list = Agenda.eventsOn(events, day.toString())
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)).background(if (day == date) colors.lavender else colors.soft).clickable { onPick(day) }.padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(day.format(DateTimeFormatter.ofPattern("EEE d", PtBr)).replaceFirstChar(Char::uppercase), style = MaterialTheme.typography.labelLarge, color = colors.text, modifier = Modifier.width(64.dp))
                    Text(
                        if (list.isEmpty()) "-" else list.joinToString(" · ") { "${it.time} ${it.title}" },
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (list.isEmpty()) colors.muted else colors.text,
                    )
                }
            }
        }
    }
}

@Composable
private fun ListPanel(events: List<StudyEvent>, start: LocalDate, onDelete: (StudyEvent) -> Unit) {
    val colors = OlenaTheme.colors
    val days = List(30) { start.plusDays(it.toLong()) }.map { it to Agenda.eventsOn(events, it.toString()) }.filter { it.second.isNotEmpty() }
    PaperCard(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (days.isEmpty()) Text(stringResource(R.string.agenda_list_empty), style = MaterialTheme.typography.bodyLarge, color = colors.muted)
            days.forEach { (day, list) ->
                Text(dayTitle(day), style = MaterialTheme.typography.titleMedium, color = colors.text)
                list.forEach { EventRow(it) { onDelete(it) } }
            }
        }
    }
}

@Composable
private fun EventRow(event: StudyEvent, onDelete: () -> Unit) {
    val colors = OlenaTheme.colors
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)).background(colors.soft).padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(event.title, style = MaterialTheme.typography.titleMedium, color = colors.text)
        Text(
            "${event.time} · ${event.durationMinutes} min" +
                if (event.recurrenceFrequency != Recurrence.none) " · " + stringResource(repeatLabel(event.recurrenceFrequency)) else "",
            style = MaterialTheme.typography.bodyMedium,
            color = colors.muted,
        )
        PaperButton(stringResource(R.string.agenda_delete), onDelete, Modifier.fillMaxWidth(), PaperButtonStyle.Quiet)
    }
}

@Composable
private fun NewEventDialog(date: String, kind: String, onDismiss: () -> Unit, onSave: (StudyEvent) -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    var minutesOfDay by remember { mutableIntStateOf(9 * 60) }
    var duration by remember { mutableIntStateOf(30) }
    var repeat by remember { mutableStateOf(Recurrence.none) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(if (kind == "study") R.string.agenda_reserve_study else R.string.agenda_new)) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
                            kind = kind,
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
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
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

@Composable
private fun TaskRow(task: StudyTask, onToggle: () -> Unit, onRemove: () -> Unit) {
    val colors = OlenaTheme.colors
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)).background(colors.soft).clickable(onClick = onToggle).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        olenastudy.app.ui.components.PaperCheckbox(checked = task.completed)
        Text(
            task.title,
            style = MaterialTheme.typography.bodyLarge,
            color = if (task.completed) colors.muted else colors.text,
            textDecoration = if (task.completed) androidx.compose.ui.text.style.TextDecoration.LineThrough else null,
            modifier = Modifier.weight(1f),
        )
        Text(stringResource(R.string.agenda_delete), style = MaterialTheme.typography.labelMedium, color = colors.muted, modifier = Modifier.clickable(onClick = onRemove).padding(6.dp))
    }
}

@Composable
private fun TaskDialog(date: String, onDismiss: () -> Unit, onSave: (StudyTask) -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.agenda_create_task)) },
        text = {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it.take(120) },
                label = { Text(stringResource(R.string.agenda_field_title)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        },
        confirmButton = {
            PaperButton(stringResource(R.string.agenda_save), {
                val name = title.trim()
                if (name.isNotEmpty()) onSave(StudyTask(UUID.randomUUID().toString(), name, date))
            })
        },
        dismissButton = { PaperButton(stringResource(R.string.agenda_cancel), onDismiss, style = PaperButtonStyle.Quiet) },
    )
}
