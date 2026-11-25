package olenastudy.app.data.settings

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow

/** Um ajuste liga/desliga das Configurações, com o padrão que o site usa. */
data class Flag(val name: String, val default: Boolean)

/** Os mesmos ajustes e padrões da tela de Configurações do site. */
object SettingFlags {
    // Acessibilidade
    val ReduceMotion = Flag("reduce_motion", false)
    val HighlightSelections = Flag("highlight_selections", false)
    val SoundEffects = Flag("sound_effects", true)
    val Vibration = Flag("vibration", true)
    val Notebook3d = Flag("notebook_3d", false)

    // Cadernos: escrita e toque
    val SmartAdjust = Flag("notebook_smart_adjust", true)
    val ShapeHold = Flag("notebook_shape_hold", true)
    val PredictPen = Flag("notebook_predict_pen", true)
    val HoverPreview = Flag("notebook_hover_preview", true)
    val PenOnly = Flag("notebook_pen_only", false)
    val WindowAdvance = Flag("notebook_window_advance", true)

    // Cadernos: texto e coordenadas
    val AutoCorrect = Flag("notebook_auto_correct", true)
    val AxisValues = Flag("notebook_axis_values", true)
    val AxisEqual = Flag("notebook_axis_equal", true)

    // Notificações por tipo
    val NotifyFollowers = Flag("notify_followers", true)
    val NotifyActivity = Flag("notify_activity", true)
    val NotifyAgenda = Flag("notify_agenda", true)
    val NotifyNews = Flag("notify_news", true)
    val NotifyXp = Flag("notify_xp", true)

    // Privacidade
    val ShareActivity = Flag("share_activity", true)

    val all =
        listOf(
            ReduceMotion, HighlightSelections, SoundEffects, Vibration, Notebook3d,
            SmartAdjust, ShapeHold, PredictPen, HoverPreview, PenOnly, WindowAdvance,
            AutoCorrect, AxisValues, AxisEqual,
            NotifyFollowers, NotifyActivity, NotifyAgenda, NotifyNews, NotifyXp,
            ShareActivity,
        )
}

/** Escolhas de texto de "Estudo e foco". Valor vazio quer dizer "ainda não escolhido". */
object SettingChoices {
    const val DailyGoal = "daily_goal"
    const val StartSubject = "start_subject"
    const val Learn = "study_learn"
    const val Organize = "study_organize"
    const val Rhythm = "study_rhythm"
    const val Programming = "study_programming"
}

private val Context.appPrefsStore by preferencesDataStore(name = "app_prefs")

fun Preferences.flag(flag: Flag): Boolean = this[booleanPreferencesKey(flag.name)] ?: flag.default

fun Preferences.choice(name: String): String = this[stringPreferencesKey(name)] ?: ""

/** Ajustes do aparelho. Ficam no DataStore e valem só neste dispositivo, como o texto da tela diz. */
class AppPreferences(private val context: Context) {
    val snapshot: Flow<Preferences> = context.appPrefsStore.data

    suspend fun set(flag: Flag, value: Boolean) {
        context.appPrefsStore.edit { it[booleanPreferencesKey(flag.name)] = value }
    }

    suspend fun setChoice(name: String, value: String) {
        context.appPrefsStore.edit { it[stringPreferencesKey(name)] = value }
    }
}
