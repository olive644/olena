package olenastudy.app.domain.focus

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Semana de tomates do Pomodoro, igual a `weekDays` e `pomodoroDays` do site (src/views/focus-view.tsx):
 * sete dias começando na segunda-feira, com as letras "STQQSSD", e o tomate aceso nos dias em que
 * algum foco do Pomodoro foi concluído.
 */
object FocusWeek {
    const val LABELS = "STQQSSD"

    fun days(reference: LocalDate): List<LocalDate> {
        val monday = reference.with(DayOfWeek.MONDAY)
        return List(7) { monday.plusDays(it.toLong()) }
    }

    fun activeDays(records: List<FocusRecord>, zone: ZoneId): Set<LocalDate> =
        records.filter { it.mode == "pomodoro" && it.durationMinutes > 0 }
            .map { Instant.ofEpochMilli(it.completedAtMs).atZone(zone).toLocalDate() }
            .toSet()

    /** "25 min", "1 h" ou "1 h 5 min", como `formatFocusDuration` do site. */
    fun formatDuration(minutes: Int): String {
        val hours = minutes / 60
        val rest = minutes % 60
        return if (hours > 0) "$hours h" + (if (rest > 0) " $rest min" else "") else "$rest min"
    }
}
