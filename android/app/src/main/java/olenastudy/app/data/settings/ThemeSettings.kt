package olenastudy.app.data.settings

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/** Escolha de tema do aluno. `System` segue o modo escuro do aparelho, como o site sem escolha. */
enum class ThemeMode {
    System,
    Light,
    Dark,
    ;

    companion object {
        /** Valor guardado desconhecido ou ausente volta para o sistema, nunca derruba o app. */
        fun parse(value: String?): ThemeMode = entries.firstOrNull { it.name == value } ?: System
    }
}

private val Context.settingsStore by preferencesDataStore(name = "settings")
private val ThemeKey = stringPreferencesKey("theme_mode")

/**
 * Preferências do aparelho. O tema é só do aparelho (cache local); o que for do aluno de verdade,
 * como progresso e agenda, pertence à conta e entra por outro caminho.
 */
class ThemeSettings(private val context: Context) {
    val themeMode: Flow<ThemeMode> = context.settingsStore.data.map { ThemeMode.parse(it[ThemeKey]) }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.settingsStore.edit { it[ThemeKey] = mode.name }
    }
}
