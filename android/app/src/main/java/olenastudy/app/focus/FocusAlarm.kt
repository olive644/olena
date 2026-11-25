package olenastudy.app.focus

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import olenastudy.app.MainActivity
import olenastudy.app.R
import olenastudy.app.domain.focus.FocusPhase

private const val CHANNEL_ID = "focus_timer"
private const val ALARM_REQUEST = 1001
private const val NOTIFICATION_ID = 2001
private const val EXTRA_PHASE = "phase"

/** Alarme do fim de cada fase: acorda o aparelho, mesmo com o app fechado, e avisa por notificação. */
object FocusAlarm {
    fun schedule(context: Context, atMs: Long, phase: FocusPhase) {
        val manager = context.getSystemService(AlarmManager::class.java)
        val intent = pendingIntent(context, phase, PendingIntent.FLAG_UPDATE_CURRENT)
        // Alarme exato precisa de permissão especial no Android 12 ou mais novo. Sem ela, cai no
        // alarme aproximado (pode atrasar alguns minutos) em vez de falhar.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, intent)
        } else {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, intent)
        }
    }

    fun cancel(context: Context) {
        val manager = context.getSystemService(AlarmManager::class.java)
        manager.cancel(pendingIntent(context, FocusPhase.Focus, PendingIntent.FLAG_UPDATE_CURRENT))
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    private fun pendingIntent(context: Context, phase: FocusPhase, flag: Int): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST,
            Intent(context, FocusAlarmReceiver::class.java).putExtra(EXTRA_PHASE, phase.name),
            flag or PendingIntent.FLAG_IMMUTABLE,
        )
}

class FocusAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val phase = FocusPhase.entries.firstOrNull { it.name == intent.getStringExtra(EXTRA_PHASE) } ?: FocusPhase.Focus
        ensureChannel(context)
        val manager = NotificationManagerCompat.from(context)
        if (!manager.areNotificationsEnabled()) return
        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val (title, text) =
            if (phase == FocusPhase.Focus) {
                context.getString(R.string.focus_notification_focus_done_title) to context.getString(R.string.focus_notification_focus_done_text)
            } else {
                context.getString(R.string.focus_notification_break_done_title) to context.getString(R.string.focus_notification_break_done_text)
            }
        val notification =
            NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_focus)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(open)
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()
        try {
            manager.notify(NOTIFICATION_ID, notification)
        } catch (_: SecurityException) {
            // Sem permissão de notificação: o aviso some, mas o relógio do app continua certo.
        }
    }

    private fun ensureChannel(context: Context) {
        val channel =
            NotificationChannel(CHANNEL_ID, context.getString(R.string.focus_channel_name), NotificationManager.IMPORTANCE_HIGH)
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}
