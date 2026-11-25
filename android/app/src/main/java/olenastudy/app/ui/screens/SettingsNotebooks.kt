package olenastudy.app.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.PointerType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.R
import olenastudy.app.data.settings.Flag
import olenastudy.app.data.settings.SettingChoices
import olenastudy.app.data.settings.SettingFlags
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.paperPanel

private val GroupShape = RoundedCornerShape(topStart = 5.dp, topEnd = 18.dp, bottomEnd = 6.dp, bottomStart = 12.dp)
private val PenActions = listOf("tool" to "Usar a ferramenta selecionada", "pen" to "Caneta", "highlighter" to "Marca-texto", "eraser" to "Borracha", "pan" to "Arraste a folha para mover", "select" to "Selecionar")

private val Shortcuts =
    listOf(
        "Caneta" to "P", "Borracha" to "E", "Arraste a folha para mover" to "H", "Selecionar" to "V", "Marca-texto" to "M", "Régua" to "R", "Curva" to "C",
        "Coordenadas" to "A", "Texto" to "T", "Post-it" to "N", "Adicionar tabela" to "G", "Desfazer" to "Ctrl + Z", "Refazer" to "Ctrl + Shift + Z",
        "Refazer, alternativa" to "Ctrl + Y", "Copiar" to "Ctrl + C", "Recortar" to "Ctrl + X", "Colar" to "Ctrl + V", "Duplicar" to "Ctrl + D",
        "Selecionar tudo" to "Ctrl + A", "Copiar estilo do texto" to "Ctrl + Alt + C", "Aumentar zoom" to "Ctrl + +", "Diminuir zoom" to "Ctrl + −",
        "Restaurar enquadramento" to "Ctrl + 0", "Mover a folha temporariamente" to "Space", "Mover seleção para a esquerda" to "←",
        "Mover seleção para a direita" to "→", "Mover seleção para cima" to "↑", "Mover seleção para baixo" to "↓",
        "Mover seleção para a esquerda, passo maior" to "Shift + ←", "Mover seleção para a direita, passo maior" to "Shift + →",
        "Mover seleção para cima, passo maior" to "Shift + ↑", "Mover seleção para baixo, passo maior" to "Shift + ↓",
        "Selecionar próximo item" to "Tab", "Selecionar item anterior" to "Shift + Tab",
    )

/** Configurações > Cadernos: escrita e ferramentas, atalhos, e atalhos de caneta e mesa, com os textos e medidas do site. */
@Composable
internal fun NotebookSettingsContent() {
    val st = rememberSettingsState()
    val colors = OlenaTheme.colors
    fun row(f: Flag, title: String, hint: String): @Composable () -> Unit = { NbToggle(title, hint, st.flag(f)) { st.setFlag(f, it) } }
    StCard {
        StEyebrow("Cadernos")
        Image(painterResource(if (colors.isDark) R.drawable.art_nb_title_dark else R.drawable.art_nb_title), "Escrita e ferramentas", Modifier.size(width = 203.dp, height = 24.dp))
        NbGroup(R.drawable.art_nb_icon_0, "Escrita e toque") {
            row(SettingFlags.SmartAdjust, "Ajuste inteligente", "Suaviza o movimento e endireita linhas quase retas.")()
            row(SettingFlags.ShapeHold, "Formas ao segurar", "Segure a caneta parada no fim do traço para acertar retas, elipses, retângulos e triângulos.")()
            row(SettingFlags.ScribbleErase, "Rabiscar para apagar", "Risque a escrita em zigue-zague com a caneta para apagar os traços que ficam por baixo. Se apagar sem querer, desfaça.")()
            row(SettingFlags.PredictPen, "Prever a ponta da caneta", "Desenha um pedacinho à frente da caneta para a tinta parecer sair com menos atraso.")()
            row(SettingFlags.HoverPreview, "Prévia ao pairar a caneta", "Mostra onde a ponta vai pousar antes de tocar a folha, em canetas que avisam isso.")()
            row(SettingFlags.PenMeter, "Medidor da caneta", "Mostra na tela a entrada da caneta e o tempo de cada quadro enquanto você escreve, para achar travadas. Nada sai do aparelho.")()
        }
        NbGroup(R.drawable.art_nb_icon_1, "Seleção e organização") {
            row(SettingFlags.SnapObjects, "Encaixar objetos", "Aproxima os objetos das bordas e dos centros de outros itens ao arrastar.")()
            row(SettingFlags.AlignGuides, "Guias de alinhamento", "Mostra guias ao alinhar textos, tabelas, post-its e outros itens.")()
        }
        NbGroup(R.drawable.art_nb_icon_2, "Caneta e toque") {
            row(SettingFlags.PenOnly, "Só caneta, dedo move", "Use os dedos para navegar e a caneta para escrever.")()
        }
        NbGroup(R.drawable.art_nb_icon_3, "Texto") {
            row(SettingFlags.AutoCorrect, "Correção automática de texto", "Revisa acentos e início das frases.")()
        }
        NbGroup(R.drawable.art_nb_icon_4, "Coordenadas") {
            row(SettingFlags.AxisValues, "Medições nos eixos", "Mostra valores nas divisões dos eixos.")()
            row(SettingFlags.AxisEqual, "Eixos com o mesmo tamanho", "Mantém a mesma extensão horizontal e vertical.")()
        }
        ShortcutsSection()
        PenShortcutsSection(st)
    }
}

@Composable
private fun NbGroup(@DrawableRes icon: Int, title: String, content: @Composable () -> Unit) {
    val line = StLine
    Column(
        Modifier.fillMaxWidth().paperPanel(StSurface, line, Color.Transparent, Color.Transparent, line, GroupShape, 12.dp, 0.dp, 4.dp).padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Row(Modifier.padding(top = 4.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Image(painterResource(icon), null, Modifier.size(25.dp))
            Text(title, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = OlenaTheme.colors.text)
        }
        content()
    }
}

/** Linha de ajuste: título, texto de apoio e a caixa amarela de marcar de 22 dp. */
@Composable
private fun NbToggle(title: String, hint: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val colors = OlenaTheme.colors
    val line = StLine
    Row(
        Modifier.fillMaxWidth().clickable(role = Role.Switch) { onChange(!checked) }.semantics { stateDescription = if (checked) "Ligado" else "Desligado" }
            .drawBehind { drawLine(line, androidx.compose.ui.geometry.Offset(0f, size.height), androidx.compose.ui.geometry.Offset(size.width, size.height), 1.dp.toPx()) }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = colors.text)
            Text(hint, fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.muted)
        }
        Box(
            Modifier.size(22.dp).paperPanel(
                fill = if (checked) Color(0xFFFACC15) else StSurface,
                base = if (checked) Color(0xFFA98200) else line,
                facetLight = Color.Transparent,
                facetDark = Color.Transparent,
                border = if (checked) Color(0xFFB99100) else line,
                shape = RoundedCornerShape(topStart = 4.dp, topEnd = 7.dp, bottomEnd = 4.dp, bottomStart = 6.dp),
                radius = 6.dp,
                facet = 0.dp,
                shift = 2.dp,
            ),
            contentAlignment = Alignment.Center,
        ) { if (checked) StCheck() }
    }
}

/** "Atalhos de teclado": lista de nome e tecla, aberta por padrão como no site. Em toque os atalhos só são mostrados. */
@Composable
private fun ShortcutsSection() {
    val colors = OlenaTheme.colors
    val line = StLine
    var open by remember { mutableStateOf(true) }
    Column(
        Modifier.fillMaxWidth().paperPanel(StSurface, line, Color.Transparent, Color.Transparent, line, GroupShape, 12.dp, 0.dp, 4.dp).padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Row(Modifier.fillMaxWidth().clickable(role = Role.Button) { open = !open }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Image(painterResource(R.drawable.art_nb_icon_5), null, Modifier.size(25.dp))
            Text("Atalhos de teclado", fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = colors.text, modifier = Modifier.weight(1f))
            Text(if (open) "⌃" else "⌄", fontSize = 16.sp, color = colors.text)
        }
        if (open) {
            Column(Modifier.padding(top = 6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Use fora dos campos de texto. No Mac, ⌘ também funciona no lugar de Ctrl. Tab percorre os itens quando a folha está com foco.", fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.muted)
                Shortcuts.forEach { (name, keys) ->
                    Row(
                        Modifier.fillMaxWidth().drawBehind { drawLine(line, androidx.compose.ui.geometry.Offset(0f, size.height), androidx.compose.ui.geometry.Offset(size.width, size.height), 1.dp.toPx()) }.padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Text(name, fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.text, modifier = Modifier.weight(1f))
                        Box(
                            Modifier.heightIn(min = 30.dp).paperPanel(if (colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2), line, Color.Transparent, Color.Transparent, line, StButtonShape, 13.dp, 0.dp, 3.dp).padding(horizontal = 8.dp, vertical = 5.dp),
                            contentAlignment = Alignment.Center,
                        ) { Text(keys, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = colors.text) }
                    }
                }
            }
        }
    }
}

/** "Atalhos de caneta e mesa": o que cada botão da caneta faz e o teste de caneta. */
@Composable
private fun PenShortcutsSection(st: SettingsState) {
    val colors = OlenaTheme.colors
    val line = StLine
    Column(
        Modifier.fillMaxWidth().paperPanel(StSurface, line, Color.Transparent, Color.Transparent, line, GroupShape, 12.dp, 0.dp, 4.dp).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Image(painterResource(R.drawable.art_nb_icon_7), null, Modifier.size(25.dp))
            Text("Atalhos de caneta e mesa", fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = colors.text)
        }
        PenSelect("Botão lateral", SettingChoices.PenSideButton, st)
        PenSelect("Segundo botão", SettingChoices.PenSecondButton, st, "Segundo botão lateral, comum em canetas de mesa digitalizadora. Alguns aparelhos o enviam como botão do meio.")
        PenSelect("Ponta traseira", SettingChoices.PenEraserTip, st)
        InfoRow("Pressão da caneta", "Quando o dispositivo informa pressão, o traço acompanha o pincel escolhido.")
        InfoRow("Dois dedos", "Faça uma pinça para ajustar o zoom, quando o dispositivo enviar gestos de toque.")
        InfoRow("Botões da mesa", "No aplicativo do fabricante, atribua aos botões os atalhos de teclado desta lista.")
        Text("Testar caneta e mesa", fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = colors.text, modifier = Modifier.padding(top = 6.dp))
        Text("Encoste a caneta aqui e aperte os botões. Mostra o que o aparelho recebe de verdade.", fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.muted)
        PenTestPad()
    }
}

@Composable
private fun PenSelect(label: String, key: String, st: SettingsState, hint: String? = null) {
    val colors = OlenaTheme.colors
    val line = StLine
    var open by remember { mutableStateOf(false) }
    val current = st.choice(key).ifEmpty { "tool" }
    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(label, fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.text, modifier = Modifier.weight(1f))
            Box(Modifier.weight(2f)) {
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 44.dp).paperPanel(if (colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2), line, Color.Transparent, Color.Transparent, line, StButtonShape, 13.dp, 0.dp, 3.dp)
                        .clickable(role = Role.DropdownList) { open = true }.padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(PenActions.first { it.first == current }.second, fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.text, modifier = Modifier.weight(1f))
                    Text("⌄", fontSize = 14.sp, color = colors.text)
                }
                DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                    PenActions.forEach { (value, text) -> DropdownMenuItem(text = { Text(text, fontSize = 13.sp) }, onClick = { st.setChoice(key, value); open = false }) }
                }
            }
        }
        if (hint != null) Text(hint, fontFamily = ManropeFamily, fontSize = 10.sp, color = colors.muted)
    }
}

@Composable
private fun InfoRow(title: String, text: String) {
    val colors = OlenaTheme.colors
    val line = StLine
    Row(
        Modifier.fillMaxWidth().drawBehind { drawLine(line, androidx.compose.ui.geometry.Offset(0f, size.height), androidx.compose.ui.geometry.Offset(size.width, size.height), 1.dp.toPx()) }.padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(title, fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.text, modifier = Modifier.weight(1f))
        Text(text, fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.muted, modifier = Modifier.weight(2f))
    }
}

/** Área de teste: mostra o tipo de ponteiro (caneta, toque, borracha) e a pressão que o aparelho informa. */
@Composable
private fun PenTestPad() {
    val colors = OlenaTheme.colors
    val line = StLine
    var message by remember { mutableStateOf("Aguardando a caneta") }
    Box(
        Modifier.fillMaxWidth().height(112.dp).clip(StButtonShape)
            .paperPanel(if (colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2), line, Color.Transparent, Color.Transparent, line, StButtonShape, 13.dp, 0.dp, 3.dp)
            .pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown()
                    val kind =
                        when (down.type) {
                            PointerType.Stylus -> "Caneta"
                            PointerType.Eraser -> "Ponta traseira"
                            PointerType.Touch -> "Toque"
                            PointerType.Mouse -> "Mouse"
                            else -> "Ponteiro"
                        }
                    message = "$kind, pressão ${"%.2f".format(down.pressure)}"
                }
            }
            .padding(horizontal = 15.dp, vertical = 12.dp),
    ) {
        Text(message, fontFamily = ManropeFamily, fontSize = 13.sp, color = colors.text, modifier = Modifier.align(Alignment.CenterStart))
    }
}
