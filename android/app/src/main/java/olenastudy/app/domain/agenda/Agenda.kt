package olenastudy.app.domain.agenda

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import kotlinx.serialization.Serializable

/** Como um compromisso se repete. Os mesmos valores do site (`recurrenceFrequency`). */
@Serializable
enum class Recurrence { none, daily, weekly, monthly, yearly }

/**
 * Compromisso da Agenda. Os nomes e o formato dos campos seguem `StudyEvent` do site
 * (src/domain/workspace.ts), para o app e o site poderem trocar dados pela conta depois.
 * Datas são "AAAA-MM-DD" e horas "HH:mm". Campos do site que o app ainda não usa (convidados,
 * lembretes, fuso) ficam de fora, e o decodificador ignora o que não conhece.
 */
@Serializable
data class StudyEvent(
    val id: String,
    val title: String,
    val subjectId: String = "",
    val date: String,
    val time: String = "09:00",
    val durationMinutes: Int = 30,
    val recurrenceFrequency: Recurrence = Recurrence.none,
    val recurrenceInterval: Int = 1,
    val recurrenceDays: List<Int> = emptyList(),
    val recurrenceUntil: String? = null,
    val excludedDates: List<String> = emptyList(),
    val endDate: String? = null,
    val description: String = "",
    /** "appointment" (compromisso) ou "study" (estudo reservado), como no site. */
    val kind: String = "appointment",
)

/**
 * Regras da Agenda portadas de src/domain/agenda-calendar.ts. Os testes usam resultados reais do
 * código do site (execução em 25/11/2026), inclusive os casos estranhos, como o mensal do dia 31
 * que só cai nos meses com 31 dias: é o comportamento atual do site e o app precisa concordar.
 */
object Agenda {
    private const val MAX_SPAN_DAYS = 366L

    fun parseDate(value: String): LocalDate? =
        if (!Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(value)) {
            null
        } else {
            try {
                LocalDate.parse(value)
            } catch (_: DateTimeParseException) {
                null
            }
        }

    fun isValidDate(value: String) = parseDate(value) != null

    fun addDays(date: String, days: Long): String = LocalDate.parse(date).plusDays(days).toString()

    /** Se o compromisso COMEÇA neste dia (a primeira data ou uma repetição). */
    fun startsOn(event: StudyEvent, date: String): Boolean {
        val start = parseDate(event.date) ?: return false
        val day = parseDate(date) ?: return false
        if (day.isBefore(start) || date in event.excludedDates) return false
        if (event.recurrenceUntil != null && date > event.recurrenceUntil) return false
        if (day == start) return true
        val interval = event.recurrenceInterval.coerceAtLeast(1)
        val days = ChronoUnit.DAYS.between(start, day)
        return when (event.recurrenceFrequency) {
            Recurrence.daily -> days % interval == 0L
            Recurrence.weekly -> {
                val startMonday = start.with(DayOfWeek.MONDAY)
                val dayMonday = day.with(DayOfWeek.MONDAY)
                val weeks = ChronoUnit.DAYS.between(startMonday, dayMonday) / 7
                val allowed = if (event.recurrenceDays.isEmpty()) listOf(sundayZero(start)) else event.recurrenceDays
                weeks % interval == 0L && sundayZero(day) in allowed
            }
            Recurrence.monthly -> {
                val months = (day.year - start.year) * 12L + day.monthValue - start.monthValue
                months % interval == 0L && day.dayOfMonth == start.dayOfMonth
            }
            Recurrence.yearly ->
                (day.year - start.year) % interval == 0 &&
                    day.monthValue == start.monthValue &&
                    day.dayOfMonth == start.dayOfMonth
            Recurrence.none -> false
        }
    }

    /** Dia da semana como o JavaScript: domingo = 0, segunda = 1... sábado = 6. */
    private fun sundayZero(date: LocalDate): Int = date.dayOfWeek.value % 7

    /** Quantos dias o compromisso avança depois do primeiro (passar da meia-noite, ou `endDate`). */
    fun span(event: StudyEvent): Int {
        val end = event.endDate?.let(::parseDate)
        val start = parseDate(event.date)
        if (end != null && start != null) {
            return ChronoUnit.DAYS.between(start, end).coerceIn(0, MAX_SPAN_DAYS).toInt()
        }
        val minutes = event.time.take(2).toInt() * 60 + event.time.drop(3).toInt() + event.durationMinutes
        return minutes / 1440
    }

    /** O dia em que a ocorrência que cobre `date` começou, ou nulo se nenhuma cobre. */
    fun occurrenceOn(event: StudyEvent, date: String): String? {
        val span = span(event)
        for (offset in 0..span) {
            val start = addDays(date, -offset.toLong())
            if (startsOn(event, start)) return start
        }
        return null
    }

    /** Compromissos que ocupam o dia, ordenados por horário. */
    fun eventsOn(events: List<StudyEvent>, date: String): List<StudyEvent> =
        events.filter { occurrenceOn(it, date) != null }.sortedWith(compareBy({ it.time }, { it.title }))
}
