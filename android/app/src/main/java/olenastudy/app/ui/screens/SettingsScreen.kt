package olenastudy.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import olenastudy.app.ui.components.paperPanel
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.R
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle

private data class SettingsRow(@StringRes val title: Int, @DrawableRes val icon: Int, val appearance: Boolean = false)

private val SettingsRows =
    listOf(
        SettingsRow(R.string.settings_account, R.drawable.art_settings_account),
        SettingsRow(R.string.settings_security, R.drawable.art_settings_security),
        SettingsRow(R.string.settings_support, R.drawable.art_settings_support),
        SettingsRow(R.string.settings_appearance, R.drawable.art_settings_appearance, appearance = true),
        SettingsRow(R.string.settings_study, R.drawable.art_settings_study),
        SettingsRow(R.string.settings_notebooks, R.drawable.art_settings_notebooks),
        SettingsRow(R.string.settings_agenda, R.drawable.art_settings_notifications),
        SettingsRow(R.string.settings_privacy, R.drawable.art_settings_data),
    )

/**
 * Configurações igual às do site: título, oito áreas em cartões de papel e o rodapé com as redes.
 * Só a aparência já existe no app; as outras áreas avisam, sem fingir que funcionam.
 */
@Composable
fun SettingsScreen(themeMode: ThemeMode, onThemeModeChange: (ThemeMode) -> Unit, onBack: () -> Unit) {
    val colors = OlenaTheme.colors
    val context = LocalContext.current
    var appearanceOpen by rememberSaveable { mutableStateOf(false) }
    var soonOpen by rememberSaveable { mutableStateOf(false) }
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.End) {
            SettingsTile(onClick = onBack, description = stringResource(R.string.settings_back), modifier = Modifier.size(width = 58.dp, height = 44.dp)) {
                Image(painterResource(R.drawable.ic_paper_arrow), null, Modifier.size(30.dp).scale(scaleX = -1f, scaleY = 1f))
            }
        }
        Text(
            stringResource(R.string.settings_title),
            fontFamily = ManropeFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 26.sp,
            letterSpacing = (-1.4).sp,
            color = colors.text,
            modifier = Modifier.padding(top = 16.dp, bottom = 6.dp),
        )
        SettingsRows.forEach { row ->
            SettingsTile(
                onClick = { if (row.appearance) appearanceOpen = true else soonOpen = true },
                description = stringResource(row.title),
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Image(painterResource(row.icon), null, Modifier.size(28.dp))
                    Text(
                        stringResource(row.title),
                        fontFamily = ManropeFamily,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 14.sp,
                        color = Color(0xFF292432),
                        modifier = Modifier.weight(1f),
                    )
                    Text("›", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF66616B))
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 18.dp), horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally)) {
            listOf(
                Triple(R.drawable.art_social_instagram, "Instagram", "https://www.instagram.com/olenastudy.app/"),
                Triple(R.drawable.art_social_tiktok, "TikTok", "https://www.tiktok.com/@olena.app"),
                Triple(R.drawable.art_social_discord, "Discord", "https://discord.gg/EHh6VpGUd"),
            ).forEach { (icon, name, url) ->
                SettingsTile(
                    onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) },
                    description = name,
                    modifier = Modifier.size(width = 48.dp, height = 44.dp),
                ) { Image(painterResource(icon), null, Modifier.size(28.dp)) }
            }
        }
        Text(
            stringResource(R.string.settings_version),
            style = MaterialTheme.typography.bodyMedium,
            color = colors.muted,
            modifier = Modifier.align(Alignment.CenterHorizontally).padding(bottom = 120.dp),
        )
    }
    if (appearanceOpen) {
        AlertDialog(
            onDismissRequest = { appearanceOpen = false },
            title = { Text(stringResource(R.string.profile_appearance_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.profile_appearance_hint), style = MaterialTheme.typography.bodyMedium, color = colors.muted)
                    SettingsThemeChoice(R.string.theme_system, ThemeMode.System, themeMode, onThemeModeChange)
                    SettingsThemeChoice(R.string.theme_light, ThemeMode.Light, themeMode, onThemeModeChange)
                    SettingsThemeChoice(R.string.theme_dark, ThemeMode.Dark, themeMode, onThemeModeChange)
                }
            },
            confirmButton = { PaperButton(stringResource(R.string.agenda_cancel), { appearanceOpen = false }, style = PaperButtonStyle.Quiet) },
        )
    }
    if (soonOpen) {
        AlertDialog(
            onDismissRequest = { soonOpen = false },
            title = { Text(stringResource(R.string.settings_soon_title)) },
            text = { Text(stringResource(R.string.settings_soon_text), style = MaterialTheme.typography.bodyMedium, color = colors.muted) },
            confirmButton = { PaperButton(stringResource(R.string.agenda_cancel), { soonOpen = false }, style = PaperButtonStyle.Quiet) },
        )
    }
}

/** Peça de papel clara e em relevo, igual aos botões secundários do site. */
@Composable
private fun SettingsTile(onClick: () -> Unit, description: String, modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    val dark = OlenaTheme.colors.isDark
    Box(
        modifier = modifier
            .semantics { contentDescription = description }
            .paperPanel(
                fill = if (dark) Color(0xFFFFF9EF) else Color.White,
                base = if (dark) Color(0xFFC8BAA4) else Color(0xFFD7CBB7),
                facetLight = Color(0xFFF1E9DC),
                facetDark = Color(0xFFE6DAC3),
                border = Color.Transparent,
                shape = RoundedCornerShape(topStart = 8.dp, topEnd = 16.dp, bottomEnd = 10.dp, bottomStart = 13.dp),
                radius = 13.dp,
                facet = 18.dp,
                shift = 4.dp,
            )
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content,
    )
}

@Composable
private fun SettingsThemeChoice(@StringRes label: Int, mode: ThemeMode, current: ThemeMode, onChange: (ThemeMode) -> Unit) {
    PaperButton(
        text = stringResource(label),
        onClick = { onChange(mode) },
        modifier = Modifier.fillMaxWidth(),
        style = if (mode == current) PaperButtonStyle.Primary else PaperButtonStyle.Quiet,
        selected = mode == current,
    )
}
