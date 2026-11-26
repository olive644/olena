package olenastudy.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import olenastudy.app.R
import olenastudy.app.domain.profile.ProfileInfo
import olenastudy.app.domain.profile.ProfileRules
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.paperPanel

private val Ink: Color @Composable get() = Dlg.ink
private val Muted: Color @Composable get() = Dlg.muted
private val FieldShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val DialogShape = RoundedCornerShape(topStart = 22.dp, topEnd = 38.dp, bottomEnd = 24.dp, bottomStart = 30.dp)

private const val CUSTOM = "custom"

/** "Editar perfil": nome, @, bio, pronomes e até 5 redes, com os mesmos rótulos, limites e erros do site. */
@Composable
fun ProfileEditDialog(current: ProfileInfo, onDismiss: () -> Unit, onSave: (ProfileInfo) -> Unit) {
    val defaultName = stringResource(R.string.profile_title)
    var name by rememberSaveable { mutableStateOf(current.name.ifBlank { defaultName }) }
    var username by rememberSaveable { mutableStateOf(current.username) }
    var bio by rememberSaveable { mutableStateOf(current.bio) }
    var pronouns by rememberSaveable { mutableStateOf(current.pronouns) }
    var pronounMode by rememberSaveable {
        mutableStateOf(if (current.pronouns.isEmpty() || current.pronouns in ProfileRules.PRONOUN_PRESETS) current.pronouns else CUSTOM)
    }
    var pickerOpen by rememberSaveable { mutableStateOf(false) }
    var links by rememberSaveable { mutableStateOf(if (current.socialLinks.isEmpty()) listOf("") else current.socialLinks) }
    var error by rememberSaveable { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            Modifier
                .padding(horizontal = 19.dp, vertical = 40.dp)
                .fillMaxWidth()
                .clip(DialogShape)
                .background(Dlg.bg)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 17.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(Modifier.fillMaxWidth().height(44.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.profile_edit_title), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Ink, modifier = Modifier.weight(1f))
                Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onDismiss).semantics { contentDescription = "Fechar edição de perfil" }, contentAlignment = Alignment.Center) {
                    Image(painterResource(R.drawable.art_close), null, Modifier.size(28.dp))
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Dlg.line))

            Field(stringResource(R.string.profile_field_name), name, { name = it.take(ProfileRules.NAME_MAX) })
            Field(stringResource(R.string.profile_field_username), username, { }, enabled = false, hint = stringResource(R.string.profile_username_guest))
            Field(stringResource(R.string.profile_field_bio), bio, { bio = it.take(ProfileRules.BIO_MAX) }, minHeight = 90.dp, singleLine = false)
            Text("${bio.length}/${ProfileRules.BIO_MAX}", fontFamily = ManropeFamily, fontSize = 11.sp, color = Muted)

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Label(stringResource(R.string.profile_field_pronouns))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(46.dp)
                        .paperPanel(Dlg.input, Dlg.line, Color.Transparent, Color.Transparent, Dlg.inputBorder, FieldShape, 13.dp, 0.dp, 3.dp)
                        .clickable(role = Role.DropdownList) { pickerOpen = !pickerOpen }
                        .padding(horizontal = 14.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    Text(
                        when (pronounMode) {
                            "" -> stringResource(R.string.profile_pronouns_none)
                            CUSTOM -> stringResource(R.string.profile_pronouns_custom)
                            else -> pronounMode
                        },
                        fontFamily = ManropeFamily, fontSize = 14.sp, color = Ink,
                    )
                    Image(painterResource(R.drawable.ic_paper_arrow), null, Modifier.align(Alignment.CenterEnd).size(24.dp))
                }
                if (pickerOpen) {
                    listOf("" to stringResource(R.string.profile_pronouns_none)).plus(ProfileRules.PRONOUN_PRESETS.map { it to it }).plus(CUSTOM to stringResource(R.string.profile_pronouns_custom)).forEach { (value, label) ->
                        Text(
                            label,
                            fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Ink,
                            modifier = Modifier.fillMaxWidth().clip(FieldShape).background(if (value == pronounMode) Color(0xFFFACC15) else Dlg.input).clickable(role = Role.RadioButton) {
                                pronounMode = value
                                pronouns = if (value == CUSTOM) pronouns else value
                                pickerOpen = false
                            }.padding(12.dp),
                        )
                    }
                }
                if (pronounMode == CUSTOM) {
                    Field(stringResource(R.string.profile_pronouns_custom_label), pronouns, { pronouns = it.take(ProfileRules.PRONOUNS_MAX) }, placeholder = stringResource(R.string.profile_pronouns_example))
                }
            }

            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(topStart = 5.dp, topEnd = 22.dp, bottomEnd = 12.dp, bottomStart = 18.dp)).background(Dlg.section).padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(stringResource(R.string.profile_socials), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Ink)
                links.forEachIndexed { index, link ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                        Box(Modifier.weight(1f)) {
                            Field(
                                "${stringResource(R.string.profile_social)} ${index + 1}",
                                link,
                                { value -> links = links.mapIndexed { i, old -> if (i == index) value.take(500) else old } },
                                placeholder = stringResource(R.string.profile_social_hint),
                                keyboardType = KeyboardType.Uri,
                            )
                        }
                        Box(
                            Modifier.size(46.dp).paperPanel(Dlg.input, Dlg.line, Color.Transparent, Color.Transparent, Dlg.inputBorder, FieldShape, 13.dp, 0.dp, 3.dp)
                                .clickable(role = Role.Button) { links = links.filterIndexed { i, _ -> i != index }.ifEmpty { listOf("") } }
                                .semantics { contentDescription = "Remover rede social ${index + 1}" },
                            contentAlignment = Alignment.Center,
                        ) { Image(painterResource(R.drawable.art_icon_trash), null, Modifier.size(26.dp)) }
                    }
                }
                PaperButton(
                    stringResource(R.string.profile_add_social),
                    { if (links.size < ProfileRules.LINKS_MAX) links = links + "" },
                    Modifier.fillMaxWidth(),
                    PaperButtonStyle.Quiet,
                    enabled = links.size < ProfileRules.LINKS_MAX,
                )
            }
            Text(stringResource(R.string.profile_guest_hint), fontFamily = ManropeFamily, fontSize = 12.sp, color = Muted)
            if (error.isNotEmpty()) Text(error, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFFB3261E))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                PaperButton(stringResource(R.string.agenda_cancel), onDismiss, Modifier.weight(1f), PaperButtonStyle.Quiet)
                PaperButton(
                    stringResource(R.string.profile_save),
                    {
                        val draft = ProfileInfo(name.trim(), username, bio, pronouns, links.filter { it.isNotBlank() })
                        val problem = ProfileRules.validate(draft)
                        if (problem == null) onSave(draft) else error = problem
                    },
                    Modifier.weight(1.4f),
                )
            }
        }
    }
}

@Composable
private fun Label(text: String) {
    Text(text, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = Color(0xFF0F0F14))
}

/** Campo de texto do site: rótulo em cima, caixa branca com base e dica opcional embaixo. */
@Composable
private fun Field(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    enabled: Boolean = true,
    hint: String? = null,
    placeholder: String = "",
    minHeight: androidx.compose.ui.unit.Dp = 46.dp,
    singleLine: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Label(label)
        Box(
            Modifier
                .fillMaxWidth()
                .heightIn(min = minHeight)
                .paperPanel(if (enabled) Dlg.input else Dlg.inputOff, Dlg.line, Color.Transparent, Color.Transparent, Dlg.inputBorder, FieldShape, 13.dp, 0.dp, 3.dp)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            contentAlignment = if (singleLine) Alignment.CenterStart else Alignment.TopStart,
        ) {
            BasicTextField(
                value = value,
                onValueChange = onChange,
                enabled = enabled,
                singleLine = singleLine,
                textStyle = TextStyle(fontFamily = ManropeFamily, fontSize = 14.sp, color = Dlg.inputText),
                cursorBrush = SolidColor(Dlg.inputText),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                modifier = Modifier.fillMaxWidth(),
                decorationBox = { inner ->
                    if (value.isEmpty() && placeholder.isNotEmpty()) Text(placeholder, fontFamily = ManropeFamily, fontSize = 14.sp, color = Color(0xFF9A93A1))
                    inner()
                },
            )
        }
        if (hint != null) Text(hint, fontFamily = ManropeFamily, fontSize = 12.sp, color = Muted)
    }
}
