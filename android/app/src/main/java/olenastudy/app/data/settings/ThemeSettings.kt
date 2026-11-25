package olenastudy.app.data.settings

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import olenastudy.app.domain.profile.ProfileAvatars
import olenastudy.app.domain.profile.ProfileCosmetics
import olenastudy.app.domain.profile.ProfileInfo
import olenastudy.app.domain.profile.ProfileLook

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
private val AvatarKey = stringPreferencesKey("avatar_id")
private val FrameKey = stringPreferencesKey("profile_frame")
private val NameKey = stringPreferencesKey("profile_name")
private val UsernameKey = stringPreferencesKey("profile_username")
private val BioKey = stringPreferencesKey("profile_bio")
private val PronounsKey = stringPreferencesKey("profile_pronouns")
private val LinksKey = stringPreferencesKey("profile_links")
private val CoverKey = stringPreferencesKey("profile_cover")
private val BackgroundKey = stringPreferencesKey("profile_background")

/**
 * Preferências do aparelho. O tema é só do aparelho (cache local); o que for do aluno de verdade,
 * como progresso e agenda, pertence à conta e entra por outro caminho.
 */
class ThemeSettings(private val context: Context) {
    val themeMode: Flow<ThemeMode> = context.settingsStore.data.map { ThemeMode.parse(it[ThemeKey]) }

    /** Avatar escolhido no perfil; id desconhecido ou ausente vira o padrão ao ler. */
    val avatarId: Flow<String> = context.settingsStore.data.map { it[AvatarKey] ?: "helena" }

    /** Avatar, moldura, capa e fundo do perfil. Valores desconhecidos voltam ao padrão ao ler. */
    val look: Flow<ProfileLook> =
        context.settingsStore.data.map {
            ProfileLook(
                avatarId = ProfileAvatars.resolve(it[AvatarKey]).id,
                frameId = ProfileCosmetics.frame(it[FrameKey]),
                coverId = ProfileCosmetics.cover(it[CoverKey]),
                backgroundId = ProfileCosmetics.background(it[BackgroundKey]),
            )
        }

    /** Nome, bio, pronomes e redes do perfil. Neste aparelho até o login existir. */
    val info: Flow<ProfileInfo> =
        context.settingsStore.data.map {
            ProfileInfo(
                name = it[NameKey] ?: "",
                username = it[UsernameKey] ?: "",
                bio = it[BioKey] ?: "",
                pronouns = it[PronounsKey] ?: "",
                socialLinks = (it[LinksKey] ?: "").split('\n').filter { link -> link.isNotBlank() },
            )
        }

    suspend fun setInfo(info: ProfileInfo) {
        context.settingsStore.edit {
            it[NameKey] = info.name
            it[UsernameKey] = info.username
            it[BioKey] = info.bio
            it[PronounsKey] = info.pronouns
            it[LinksKey] = info.socialLinks.joinToString("\n")
        }
    }

    suspend fun setLook(look: ProfileLook) {
        context.settingsStore.edit {
            it[AvatarKey] = look.avatarId
            it[FrameKey] = look.frameId
            it[CoverKey] = look.coverId
            it[BackgroundKey] = look.backgroundId
        }
    }

    suspend fun setAvatarId(id: String) {
        context.settingsStore.edit { it[AvatarKey] = id }
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.settingsStore.edit { it[ThemeKey] = mode.name }
    }
}
