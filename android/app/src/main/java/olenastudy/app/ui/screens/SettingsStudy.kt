package olenastudy.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.launch
import olenastudy.app.data.settings.AppPreferences
import olenastudy.app.data.settings.SettingChoices
import olenastudy.app.data.settings.choice
import olenastudy.app.domain.focus.Pomodoro
import olenastudy.app.domain.focus.PomodoroConfig
import olenastudy.app.focus.FocusController
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.paperPanel
import olenastudy.app.ui.components.ReadStateContent
import olenastudy.app.R

/** O controlador do Foco, para as Configurações mudarem o Pomodoro. Nulo em pré-visualizações. */
val LocalFocusController = compositionLocalOf<FocusController?> { null }

private const val SLIDER_MIN = 5
private const val SLIDER_MAX = 120

/** Configurações > Estudo e foco: ritmo do Pomodoro, jeito de estudar e qualidade dos flashcards. */
@Composable
internal fun StudySettingsContent() {
    val controller = LocalFocusController.current
    if (controller == null) {
        LoadedStudySettingsContent(PomodoroConfig(), {})
    } else {
        val state by controller.state.collectAsStateWithLifecycle()
        ReadStateContent(state, controller::retryRead, stringResource(R.string.loading_focus), scrollStatus = false) { snapshot ->
            LoadedStudySettingsContent(snapshot.config, controller::setConfig)
        }
    }
}

@Composable
private fun LoadedStudySettingsContent(config: PomodoroConfig, change: (PomodoroConfig) -> Unit) {
    val context = LocalContext.current
    val prefs = remember { AppPreferences(context) }
    val scope = rememberCoroutineScope()
    val stored by prefs.snapshot.collectAsStateWithLifecycle(initialValue = null)
    fun get(name: String) = stored?.choice(name) ?: ""
    fun put(name: String, value: String) = scope.launch { prefs.setChoice(name, value) }

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        StCard {
            StEyebrow("Método Pomodoro")
            StTitle("Seu ritmo de foco")
            StLegend("Meta diária")
            val goal = get(SettingChoices.DailyGoal).ifEmpty { "none" }
            StGrid(
                listOf("none" to "Sem meta fixa", "5" to "5 minutos", "15" to "15 minutos", "30" to "30 minutos", "60" to "60 minutos").map { (value, label) ->
                    { m: Modifier -> StChoice(label, goal == value, m) { put(SettingChoices.DailyGoal, value) } }
                },
            )
            SubjectSelect(get(SettingChoices.StartSubject)) { put(SettingChoices.StartSubject, it) }
            StLegend("Duração da rodada")
            StGrid(
                listOf(25, 50).map { minutes ->
                    { m: Modifier -> StChoice("$minutes minutos", config.focusMinutes == minutes, m) { change(config.copy(focusMinutes = minutes)) } }
                },
            )
            StChoice("Pausa longa após 4 rodadas", config.longBreaks, Modifier.fillMaxWidth(), sub = "${config.longBreakMinutes} min") { change(config.copy(longBreaks = !config.longBreaks)) }
            DurationSetting("Tempo de estudo", config.focusMinutes) { change(config.copy(focusMinutes = it)) }
            DurationSetting("Pausa curta", config.shortBreakMinutes) { change(config.copy(shortBreakMinutes = it)) }
            DurationSetting("Pausa longa", config.longBreakMinutes) { change(config.copy(longBreakMinutes = it)) }
        }
        StCard {
            StEyebrow("Seu jeito de estudar")
            StTitle("Preferências de estudo")
            StBody("Estas escolhas organizam recomendações futuras. Você pode combinar modalidades.")
            val learn = get(SettingChoices.Learn).split(',').filter { it.isNotEmpty() }.toSet()
            ChoiceGroup("Como você prefere aprender?") {
                listOf("visual" to "Visual", "listen" to "Ouvindo e conversando", "read" to "Lendo e escrevendo", "practice" to "Praticando").map { (value, label) ->
                    { m: Modifier -> StChoice(label, value in learn, m) { put(SettingChoices.Learn, (if (value in learn) learn - value else learn + value).joinToString(",")) } }
                }
            }
            val organize = get(SettingChoices.Organize).ifEmpty { "step" }
            ChoiceGroup("Como organizar o estudo?") {
                listOf("step" to "Passo a passo", "overview" to "Visão geral primeiro").map { (value, label) ->
                    { m: Modifier -> StChoice(label, organize == value, m) { put(SettingChoices.Organize, value) } }
                }
            }
            val rhythm = get(SettingChoices.Rhythm).ifEmpty { "continuous" }
            ChoiceGroup("Qual ritmo combina com você?") {
                listOf("continuous" to "Foco contínuo", "alternate" to "Alternar estudo e pausas").map { (value, label) ->
                    { m: Modifier -> StChoice(label, rhythm == value, m) { put(SettingChoices.Rhythm, value) } }
                }
            }
            val programming = get(SettingChoices.Programming).ifEmpty { "none" }
            ChoiceGroup("Programação") {
                listOf("none" to "Agora não", "python" to "Python", "javascript" to "JavaScript", "both" to "Python e JavaScript", "web" to "HTML e CSS").map { (value, label) ->
                    { m: Modifier -> StChoice(label, programming == value, m) { put(SettingChoices.Programming, value) } }
                }
            }
        }
        StCard {
            StTitle("Qualidade dos flashcards")
            StBody("Mostra o que você aceitou, editou e descartou nos flashcards automáticos. Os números ficam só neste aparelho e não guardam nenhum texto.", muted = false)
            StBody("Ainda não há dados. Estude um baralho e use Afirmação ruim ou Editar cartão.", muted = false)
            StBody("Filtro aprendendo: 0 de 30 avaliações para começar a agir.", muted = false)
            StButton("Zerar contadores e filtro", Modifier.fillMaxWidth()) { }
        }
    }
}

@Composable
private fun ChoiceGroup(title: String, items: () -> List<@Composable (Modifier) -> Unit>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = OlenaTheme.colors.text, modifier = Modifier.padding(start = 2.dp))
        StGrid(items())
    }
}

/** "Matéria inicial": como no site, só "Escolher depois" e "Inglês". */
@Composable
private fun SubjectSelect(value: String, onPick: (String) -> Unit) {
    var open by remember { mutableStateOf(false) }
    val dark = OlenaTheme.colors.isDark
    val line = if (dark) Color(0xFF51465D) else Color(0xFF767676)
    val ink = if (dark) Color(0xFFFFF9EF) else Color.Black
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Matéria inicial", fontFamily = ManropeFamily, fontSize = 16.sp, color = OlenaTheme.colors.text)
        Box {
            Row(
                Modifier.fillMaxWidth().height(44.dp).clip(RoundedCornerShape(2.dp))
                    .paperPanel(if (dark) Color(0xFF292432) else Color.White, Color.Transparent, Color.Transparent, Color.Transparent, line, RoundedCornerShape(2.dp), 2.dp, 0.dp, 0.dp)
                    .clickable { open = true }.padding(horizontal = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(if (value == "english") "Inglês" else "Escolher depois", fontFamily = ManropeFamily, fontSize = 16.sp, color = ink, modifier = Modifier.weight(1f))
                Text("⌄", fontSize = 16.sp, color = ink)
            }
            DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                DropdownMenuItem(text = { Text("Escolher depois") }, onClick = { onPick(""); open = false })
                DropdownMenuItem(text = { Text("Inglês") }, onClick = { onPick("english"); open = false })
            }
        }
    }
}

/** Duração em minutos: controle deslizante de 5 min a 2 h, campos de horas e minutos e o botão Usar duração. */
@Composable
private fun DurationSetting(label: String, minutes: Int, onChange: (Int) -> Unit) {
    val colors = OlenaTheme.colors
    val line = StLine
    val sliderShape = RoundedCornerShape(topStart = 5.dp, topEnd = 12.dp, bottomEnd = 6.dp, bottomStart = 10.dp)
    var hours by remember(minutes) { mutableStateOf((minutes / 60).toString()) }
    var mins by remember(minutes) { mutableStateOf((minutes % 60).toString()) }
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(
            Modifier.fillMaxWidth().paperPanel(StSurface, Color.Transparent, Color.Transparent, Color.Transparent, line, sliderShape, 12.dp, 0.dp, 0.dp).padding(horizontal = 12.dp, vertical = 10.dp),
        ) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(label, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 11.52.sp, color = colors.muted, modifier = Modifier.weight(1f))
                Text("$minutes min", fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 14.4.sp, color = if (colors.isDark) Color(0xFFA685FA) else Color(0xFF7C3AED))
            }
            Slider(
                value = minutes.coerceIn(SLIDER_MIN, SLIDER_MAX).toFloat(),
                onValueChange = { onChange(it.toInt()) },
                valueRange = SLIDER_MIN.toFloat()..SLIDER_MAX.toFloat(),
                colors = SliderDefaults.colors(thumbColor = Color(0xFFFACC15), activeTrackColor = Color(0xFF51259B), inactiveTrackColor = if (colors.isDark) Color(0xFF423D4C) else Color(0xFFD3C7AC)),
                modifier = Modifier.fillMaxWidth(),
            )
            Row(Modifier.fillMaxWidth()) {
                Text("5 min", fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 9.92.sp, color = colors.muted, modifier = Modifier.weight(1f))
                Text("2 h", fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 9.92.sp, color = colors.muted)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Bottom) {
            NumberBox("Horas", hours) { hours = it.filter(Char::isDigit).take(2) }
            Text(":", fontFamily = ManropeFamily, fontSize = 16.sp, color = colors.text, modifier = Modifier.padding(bottom = 12.dp))
            NumberBox("Minutos", mins) { mins = it.filter(Char::isDigit).take(2) }
            StButton("Usar duração", Modifier.width(108.dp).padding(bottom = 2.dp)) {
                val total = (hours.toIntOrNull() ?: 0) * 60 + (mins.toIntOrNull() ?: 0)
                if (Pomodoro.isValidMinutes(total)) onChange(total)
            }
        }
    }
}

@Composable
private fun NumberBox(label: String, value: String, onChange: (String) -> Unit) {
    val colors = OlenaTheme.colors
    val line = StLine
    Column(Modifier.width(54.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, fontFamily = ManropeFamily, fontSize = 13.sp, color = colors.text)
        Box(
            Modifier.fillMaxWidth().height(46.dp)
                .paperPanel(if (colors.isDark) Color(0xFF292432) else Color.White, Color.Transparent, Color.Transparent, Color.Transparent, line, RoundedCornerShape(topStart = 4.dp, topEnd = 12.dp, bottomEnd = 4.dp, bottomStart = 8.dp), 8.dp, 0.dp, 0.dp)
                .padding(horizontal = 10.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            BasicTextField(
                value = value, onValueChange = onChange, singleLine = true,
                textStyle = TextStyle(fontFamily = ManropeFamily, fontSize = 18.sp, color = colors.text, textAlign = TextAlign.Start),
                cursorBrush = SolidColor(colors.text),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
