package olenastudy.app.ui.screens

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import olenastudy.app.R
import olenastudy.app.data.settings.AppPreferences
import olenastudy.app.data.settings.Flag
import olenastudy.app.data.settings.SettingChoices
import olenastudy.app.data.settings.SettingFlags
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.data.settings.choice
import olenastudy.app.data.settings.flag
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperCheckbox
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.paperPanel

private enum class Section(val title: String, @DrawableRes val icon: Int) {
    Account("Conta", R.drawable.art_settings_account),
    Security("Segurança", R.drawable.art_settings_security),
    Support("Conversar com o time", R.drawable.art_settings_support),
    Appearance("Aparência e acessibilidade", R.drawable.art_settings_appearance),
    Study("Estudo e foco", R.drawable.art_settings_study),
    Notebooks("Cadernos", R.drawable.art_settings_notebooks),
    Agenda("Agenda e notificações", R.drawable.art_settings_notifications),
    Privacy("Privacidade e dados", R.drawable.art_settings_data),
}

private const val PRIVACY_URL = "https://www.olenastudy.com.br/politica-de-privacidade.html"
private const val TERMS_URL = "https://www.olenastudy.com.br/termos-de-uso.html"
private val Ink = Color(0xFF292432)

/**
 * Configurações do site: lista de oito áreas e, em cada uma, os mesmos ajustes, rótulos e textos.
 * Os ajustes ficam neste aparelho (DataStore). O que depende de conta (entrar, sessão, conversa, exportar,
 * atividades compartilhadas) aparece com o texto do site e avisa que precisa do login, sem fingir que funciona.
 */
@Composable
fun SettingsScreen(themeMode: ThemeMode, onThemeModeChange: (ThemeMode) -> Unit, onBack: () -> Unit) {
    val colors = OlenaTheme.colors
    val context = LocalContext.current
    val store = remember { AppPreferences(context.applicationContext) }
    val prefs by store.snapshot.collectAsState(initial = null)
    val scope = rememberCoroutineScope()
    var sectionName by rememberSaveable { mutableStateOf<String?>(null) }
    var note by rememberSaveable { mutableStateOf<String?>(null) }
    val section = Section.entries.firstOrNull { it.name == sectionName }
    val onFlag: (Flag, Boolean) -> Unit = { flag, value -> scope.launch { store.set(flag, value) } }
    val onChoice: (String, String) -> Unit = { name, value -> scope.launch { store.setChoice(name, value) } }
    fun flag(f: Flag) = prefs?.flag(f) ?: f.default
    fun choice(n: String) = prefs?.choice(n) ?: ""

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.End) {
            SettingsTile(
                onClick = { if (section == null) onBack() else sectionName = null },
                description = stringResource(R.string.settings_back),
                modifier = Modifier.size(width = 58.dp, height = 44.dp),
                cream = true,
            ) { Image(painterResource(R.drawable.ic_paper_arrow), null, Modifier.size(30.dp).scale(scaleX = -1f, scaleY = 1f)) }
        }
        Text(
            stringResource(R.string.settings_title),
            fontFamily = ManropeFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 26.sp,
            letterSpacing = (-1.4).sp,
            color = colors.text,
            modifier = Modifier.padding(top = 16.dp),
        )
        if (section == null) {
            Section.entries.forEach { row ->
                SettingsTile(onClick = { sectionName = row.name }, description = row.title, modifier = Modifier.fillMaxWidth().height(56.dp)) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Image(painterResource(row.icon), null, Modifier.size(28.dp))
                        Text(row.title, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = OlenaTheme.colors.text, modifier = Modifier.weight(1f))
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
                    SettingsTile(onClick = { openUrl(context, url) }, description = name, modifier = Modifier.size(width = 48.dp, height = 44.dp)) {
                        Image(painterResource(icon), null, Modifier.size(28.dp))
                    }
                }
            }
            Text(
                stringResource(R.string.settings_version),
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
        } else {
            Text(section.title, fontFamily = ManropeFamily, fontWeight = FontWeight.Medium, fontSize = 20.sp, color = colors.text)
            when (section) {
                Section.Account ->
                    StCard {
                        StEyebrow("Sua identidade")
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                            Image(painterResource(avatarArt(LocalProfileLook.current.avatarId)), null, Modifier.size(48.dp))
                            Text(LocalProfileInfo.current.name.ifBlank { "Seu perfil" }, fontFamily = ManropeFamily, fontWeight = FontWeight.SemiBold, fontSize = 17.sp, color = colors.text)
                        }
                        Text("Informações", fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = colors.text, modifier = Modifier.padding(top = 6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text("E-mail", fontFamily = ManropeFamily, fontSize = 14.sp, color = colors.muted, modifier = Modifier.width(112.dp))
                            Text("Nenhum e-mail conectado", fontFamily = ManropeFamily, fontSize = 14.sp, color = colors.text)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text("Fuso da conta", fontFamily = ManropeFamily, fontSize = 14.sp, color = colors.muted, modifier = Modifier.width(112.dp))
                            Text(java.time.ZoneId.systemDefault().id, fontFamily = ManropeFamily, fontSize = 14.sp, color = colors.text)
                        }
                        StButton("Entrar com Google", Modifier.padding(top = 4.dp)) { note = "Entrar com a conta chega ao app junto com o login e a sincronização." }
                    }
                Section.Security ->
                    Card("SEGURANÇA", "Esta sessão") { Body("Entre na sua conta para consultar e encerrar esta sessão.") }
                Section.Support ->
                    Card("ATENDIMENTO HUMANO", "Conversar com o time") {
                        Body("Conte o que aconteceu. Não envie senhas, códigos de acesso ou documentos pessoais. O time responderá nesta conversa.")
                        PaperButton("Iniciar conversa", { note = "A conversa com o time depende da conta e chega com o login." }, Modifier.fillMaxWidth())
                    }
                Section.Appearance -> {
                    Card("APARÊNCIA", "Seu papel, sua luz") {
                        Text("Tema do aplicativo", fontFamily = ManropeFamily, fontWeight = FontWeight.Medium, fontSize = 15.sp, color = colors.text)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            listOf("Claro" to ThemeMode.Light, "Escuro" to ThemeMode.Dark, "Sistema" to ThemeMode.System).forEach { (label, mode) ->
                                ThemeTile(label, mode == themeMode, Modifier.weight(1f), if (mode == ThemeMode.Dark) R.drawable.art_theme_dark else R.drawable.art_theme_light) { onThemeModeChange(mode) }
                            }
                        }
                        Body("O tema acompanha sua conta. Sistema segue a aparência de cada dispositivo.")
                    }
                    Card("APLICATIVO", "Acessibilidade") {
                        Body("Vale para todo o aplicativo neste dispositivo.")
                        Toggle("Reduzir movimento", "Menos giros, saltos e efeitos animados. A preferência do sistema também é respeitada.", flag(SettingFlags.ReduceMotion)) { onFlag(SettingFlags.ReduceMotion, it) }
                        Toggle("Realçar seleções", "Destaques mais fortes nas opções selecionadas, além das cores e dos símbolos.", flag(SettingFlags.HighlightSelections)) { onFlag(SettingFlags.HighlightSelections, it) }
                        Toggle("Efeitos sonoros", "Sons de acerto, erro e recompensas nos minigames e na sala. Não altera as vozes dos exercícios.", flag(SettingFlags.SoundEffects)) { onFlag(SettingFlags.SoundEffects, it) }
                        Toggle("Vibrações", "Feedback tátil ao navegar e selecionar, quando o aparelho permitir.", flag(SettingFlags.Vibration)) { onFlag(SettingFlags.Vibration, it) }
                        Toggle("Caderno em 3D", "Experimental: folhas em 3D com som de papel. Pode pesar em aparelhos mais lentos.", flag(SettingFlags.Notebook3d)) { onFlag(SettingFlags.Notebook3d, it) }
                    }
                }
                Section.Study -> StudySettingsContent()
                Section.Notebooks -> NotebookSettingsContent()
                Section.Agenda -> {
                    var granted by remember { mutableStateOf(notificationsAllowed(context)) }
                    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = notificationsAllowed(context) }
                    Card(null, "Lembretes neste aparelho") {
                        Eyebrow("Notificações por tipo")
                        Toggle("Novos seguidores", "Avisos na tela e no sino quando alguém seguir você.", flag(SettingFlags.NotifyFollowers)) { onFlag(SettingFlags.NotifyFollowers, it) }
                        Toggle("Atividades e curtidas", "Conquistas de amigos e apoio às suas atividades.", flag(SettingFlags.NotifyActivity)) { onFlag(SettingFlags.NotifyActivity, it) }
                        Toggle("Lembretes da agenda", "Avisos dos eventos enquanto o aplicativo estiver aberto.", flag(SettingFlags.NotifyAgenda)) { onFlag(SettingFlags.NotifyAgenda, it) }
                        Toggle("Novidades do aplicativo", "Atualizações publicadas no sino de notificações.", flag(SettingFlags.NotifyNews)) { onFlag(SettingFlags.NotifyNews, it) }
                        Toggle("Recompensas de XP", "Avisos de pontos recebidos. Desativar não impede ganhar XP.", flag(SettingFlags.NotifyXp)) { onFlag(SettingFlags.NotifyXp, it) }
                        Body(if (granted) "Estado: Permitidos" else "Estado: Bloqueados neste aparelho")
                        Body("Os lembretes funcionam enquanto o aplicativo estiver aberto. Escolha a antecedência dentro de cada evento da Agenda.")
                        if (!granted) Body("Para permitir, use o botão abaixo ou abra as configurações do aplicativo no aparelho.")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            PaperButton("Permitir notificações", {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) ask.launch(Manifest.permission.POST_NOTIFICATIONS) else granted = true
                            }, Modifier.weight(1f))
                            PaperButton("Verificar permissão", { granted = notificationsAllowed(context) }, Modifier.weight(1f), PaperButtonStyle.Quiet)
                        }
                    }
                }
                Section.Privacy -> {
                    Card("SEUS DADOS", "Exportar uma cópia") {
                        Body("Baixa os estudos e preferências disponíveis neste aparelho em JSON. Arquivos que existem somente na nuvem e conversas do atendimento não são baixados por esta ação.")
                        Body("A cópia contém seus textos e dados pessoais, sem criptografia. Guarde em um lugar seguro.")
                        Body("Aguarde a conta carregar ou entre para exportar os dados corretos.")
                        PaperButton("Exportar meus dados", { note = "A exportação depende da conta e chega com o login." }, Modifier.fillMaxWidth())
                    }
                    Card("PRIVACIDADE", "Privacidade") {
                        PaperButton("Ver detalhes", { openUrl(context, PRIVACY_URL) }, Modifier.fillMaxWidth(), PaperButtonStyle.Quiet)
                        Body("Usamos armazenamento necessário para sua conta, estudos e preferências.")
                        Link("Política de privacidade") { openUrl(context, PRIVACY_URL) }
                    }
                    Card(null, "Suas atividades") {
                        Toggle(
                            "Mostrar atividades para todo mundo",
                            "Compartilhe novas conquistas de prática, foco e sequências. Conteúdo dos seus estudos nunca é publicado. Ao desativar, as atividades e curtidas são removidas.",
                            flag(SettingFlags.ShareActivity),
                        ) { onFlag(SettingFlags.ShareActivity, it) }
                        Body("Entre na conta para gerenciar atividades compartilhadas.")
                    }
                    Card(null, "Termos de uso") { Link("Termos de uso") { openUrl(context, TERMS_URL) } }
                }
            }
        }
        Box(Modifier.height(120.dp))
    }
    note?.let {
        AlertDialog(
            onDismissRequest = { note = null },
            title = { Text("Em breve no app") },
            text = { Text(it, style = MaterialTheme.typography.bodyMedium, color = colors.muted) },
            confirmButton = { PaperButton("Entendi", { note = null }, style = PaperButtonStyle.Quiet) },
        )
    }
}

private fun openUrl(context: Context, url: String) {
    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
}

private fun notificationsAllowed(context: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
        context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

/** Cartão da área: marca em roxo, título e conteúdo, com as medidas exatas do site (SettingsKit). */
@Composable
internal fun Card(eyebrow: String?, title: String, content: @Composable () -> Unit) {
    StCard {
        if (eyebrow != null) StEyebrow(eyebrow)
        StTitle(title)
        content()
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    val colors = OlenaTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = colors.muted)
        Text(value, fontFamily = ManropeFamily, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = colors.text)
    }
}

@Composable
internal fun Eyebrow(text: String) {
    StLegend(text)
}

@Composable
internal fun Body(text: String) {
    StBody(text, size = 15f, muted = false)
}

@Composable
internal fun Link(text: String, onClick: () -> Unit) {
    Row(Modifier.clickable(role = Role.Button, onClick = onClick).padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = OlenaTheme.colors.violet)
        Image(painterResource(R.drawable.ic_paper_arrow), null, Modifier.size(22.dp))
    }
}

/** Ajuste liga/desliga: título, explicação e a caixa de papel, que fica amarela quando marcada. */
@Composable
internal fun Toggle(title: String, hint: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val colors = OlenaTheme.colors
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(role = Role.Checkbox) { onChange(!checked) }
            .semantics { selected = checked }
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontFamily = ManropeFamily, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = colors.text)
            Text(hint, style = MaterialTheme.typography.bodyMedium, fontSize = 13.sp, color = colors.muted)
        }
        PaperCheckbox(checked)
    }
}

/** Botões de escolha em duas colunas: o escolhido fica amarelo com o visto, como no site. Vários podem ficar marcados. */
@Composable
internal fun Choices(options: List<Pair<String, String>>, selected: Set<String>, onPick: (String) -> Unit) {
    StGrid(options.map { (id, label) -> { mod: Modifier -> StChoice(label, id in selected, mod) { onPick(id) } } })
}

/** Peça de papel clara e em relevo, igual aos botões secundários do site. */
@Composable
internal fun SettingsTile(onClick: () -> Unit, description: String, modifier: Modifier = Modifier, cream: Boolean = false, content: @Composable BoxScope.() -> Unit) {
    val shape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
    Box(
        modifier = modifier
            .semantics { contentDescription = description }
            .paperPanel(
                fill = if (cream) Color(0xFFFFF9EF) else Dlg.secondary,
                base = if (cream) Color(0xFFC8BAA4) else Dlg.line,
                facetLight = if (cream) Color(0xFFE9DDC6) else Dlg.secondaryFacet,
                facetDark = Color.Transparent,
                border = if (cream) Color(0xFFD7CBB7) else Dlg.line,
                shape = shape,
                radius = 13.dp,
                facet = 16.dp,
                shift = if (cream) 3.dp else 4.dp,
            )
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content,
    )
}

/** Acesso às preferências do aparelho para as seções de Configurações (DataStore, via AppPreferences). */
internal class SettingsState(
    private val prefs: androidx.datastore.preferences.core.Preferences?,
    private val store: AppPreferences,
    private val scope: kotlinx.coroutines.CoroutineScope,
) {
    fun flag(f: Flag): Boolean = prefs?.flag(f) ?: f.default

    fun choice(name: String): String = prefs?.choice(name) ?: ""

    fun setFlag(f: Flag, value: Boolean) {
        scope.launch { store.set(f, value) }
    }

    fun setChoice(name: String, value: String) {
        scope.launch { store.setChoice(name, value) }
    }
}

@Composable
internal fun rememberSettingsState(): SettingsState {
    val context = LocalContext.current
    val store = remember { AppPreferences(context.applicationContext) }
    val prefs by store.snapshot.collectAsState(initial = null)
    val scope = rememberCoroutineScope()
    return SettingsState(prefs, store, scope)
}

/** Escolha de tema em três colunas: roxo quando selecionado (como o site), branco em relevo nos outros. */
@Composable
private fun ThemeTile(text: String, selected: Boolean, modifier: Modifier, icon: Int, onClick: () -> Unit) {
    val line = StLine
    Box(
        modifier
            .height(74.dp)
            .semantics { this.selected = selected }
            .paperPanel(
                fill = if (selected) Color(0xFF7433E0) else StSurface,
                base = if (selected) Color(0xFF4B209B) else line,
                facetLight = if (selected) Color(0xFF8A4CE5) else if (OlenaTheme.colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2),
                facetDark = Color.Transparent,
                border = if (selected) Color(0xFF7433E0) else line,
                shape = StButtonShape,
                radius = 13.dp,
                facet = 14.dp,
                shift = 4.dp,
            )
            .clickable(role = Role.RadioButton, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
      Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Image(painterResource(icon), null, Modifier.size(24.dp))
        Text(
            text,
            fontFamily = ManropeFamily,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 13.sp,
            maxLines = 1,
            color = if (selected) Color(0xFFFFF9EF) else OlenaTheme.colors.text,
        )
      }
    }
}
