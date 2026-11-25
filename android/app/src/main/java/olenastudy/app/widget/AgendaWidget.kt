package olenastudy.app.widget

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.color.ColorProvider
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import olenastudy.app.MainActivity
import olenastudy.app.R
import olenastudy.app.data.agenda.AgendaRepository
import olenastudy.app.domain.agenda.Agenda
import olenastudy.app.domain.agenda.StudyEvent

private const val MAX_ROWS = 4

// Cores da paleta do site, nos dois temas: o widget troca sozinho com o modo escuro do aparelho.
private val Page = ColorProvider(day = Color(0xFFFFF9EF), night = Color(0xFF17151C))
private val Ink = ColorProvider(day = Color(0xFF0F0F14), night = Color(0xFFF4F2EE))
private val Muted = ColorProvider(day = Color(0xFF6B6570), night = Color(0xFFA9A3AD))
private val Violet = ColorProvider(day = Color(0xFF7C3AED), night = Color(0xFFA685FA))

/** Widget "Hoje": os próximos compromissos do dia, lidos do mesmo cache do app. */
class AgendaWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val today = LocalDate.now()
        val events = Agenda.eventsOn(AgendaRepository(context).current(), today.toString())
        provideContent { WidgetContent(context, today, events) }
    }
}

class AgendaWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = AgendaWidget()
}

@androidx.compose.runtime.Composable
private fun WidgetContent(context: Context, today: LocalDate, events: List<StudyEvent>) {
    val dateLabel = today.format(DateTimeFormatter.ofPattern("EEEE, d 'de' MMMM", Locale("pt", "BR")))
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(Page)
            .cornerRadius(20.dp)
            .padding(14.dp)
            .clickable(actionStartActivity<MainActivity>()),
    ) {
        Text(
            text = context.getString(R.string.widget_today_title),
            style = TextStyle(color = Violet, fontSize = 13.sp, fontWeight = FontWeight.Bold),
        )
        Text(
            text = dateLabel.replaceFirstChar { it.uppercase() },
            style = TextStyle(color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold),
        )
        Spacer(GlanceModifier.height(8.dp))
        if (events.isEmpty()) {
            Text(
                text = context.getString(R.string.widget_today_empty),
                style = TextStyle(color = Muted, fontSize = 14.sp),
            )
        } else {
            events.take(MAX_ROWS).forEach { event ->
                Text(
                    text = "${event.time}  ${event.title}",
                    style = TextStyle(color = Ink, fontSize = 14.sp),
                    maxLines = 1,
                )
            }
            if (events.size > MAX_ROWS) {
                Text(
                    text = context.getString(R.string.widget_today_more, events.size - MAX_ROWS),
                    style = TextStyle(color = Muted, fontSize = 12.sp),
                )
            }
        }
    }
}
