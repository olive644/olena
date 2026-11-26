package olenastudy.app.data.settings

import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.preferencesOf
import androidx.datastore.preferences.core.stringPreferencesKey
import olenastudy.app.domain.profile.ProfileInfo
import olenastudy.app.domain.profile.ProfileLook
import org.junit.Assert.assertEquals
import org.junit.Test

class SettingsSnapshotTest {
    @Test fun aSuccessfullyReadEmptyFileUsesTheExistingDefaults() {
        assertEquals(SettingsSnapshot(ThemeMode.System, ProfileLook(), ProfileInfo()), readSettings(emptyPreferences()))
    }

    @Test fun profileAndThemeAreReadFromOneVersionOfTheFile() {
        val saved = preferencesOf(
            stringPreferencesKey("theme_mode") to "Dark",
            stringPreferencesKey("avatar_id") to "helena",
            stringPreferencesKey("profile_name") to "Aluno de teste",
            stringPreferencesKey("profile_username") to "aluno",
            stringPreferencesKey("profile_bio") to "Estudando",
            stringPreferencesKey("profile_pronouns") to "ele/dele",
            stringPreferencesKey("profile_links") to "https://example.com\n\nhttps://example.org",
        )
        val result = readSettings(saved)
        assertEquals(ThemeMode.Dark, result.themeMode)
        assertEquals(ProfileInfo("Aluno de teste", "aluno", "Estudando", "ele/dele", listOf("https://example.com", "https://example.org")), result.info)
        assertEquals("helena", result.look.avatarId)
    }
}
