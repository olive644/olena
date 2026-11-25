package olenastudy.app.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import olenastudy.app.R
import olenastudy.app.domain.profile.ProfileAvatars
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle

/** Arte de cada avatar do site, pelo id guardado. */
@DrawableRes
fun avatarArt(id: String): Int =
    when (id) {
        "poliana" -> R.drawable.art_avatar_poliana
        "oliver" -> R.drawable.art_avatar_oliver
        "andreyna" -> R.drawable.art_avatar_andreyna
        "jairo" -> R.drawable.art_avatar_jairo
        "alice" -> R.drawable.art_avatar_alice
        "soso" -> R.drawable.art_avatar_soso
        "nicolas" -> R.drawable.art_avatar_nicolas
        "guilherme" -> R.drawable.art_avatar_guilherme
        "erick" -> R.drawable.art_avatar_erick
        "miau" -> R.drawable.art_avatar_miau
        "luizao" -> R.drawable.art_avatar_luizao
        "anonha" -> R.drawable.art_avatar_anonha
        "moguel" -> R.drawable.art_avatar_moguel
        "leo" -> R.drawable.art_avatar_leo
        "teco" -> R.drawable.art_avatar_teco
        else -> R.drawable.art_avatar_helena
    }

/** "Personalize seu perfil": pré-visualização com a capa e a grade de avatares do site. */
@Composable
fun ProfileAvatarDialog(currentId: String, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    val colors = OlenaTheme.colors
    var chosen by rememberSaveable { mutableStateOf(ProfileAvatars.resolve(currentId).id) }
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 24.dp, bottomEnd = 18.dp, bottomStart = 22.dp))
                .background(colors.surface)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.profile_customize_title), fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = colors.text)
            Box(Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(14.dp))) {
                Image(painterResource(R.drawable.ic_profile_cover), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(120.dp))
                Image(
                    painterResource(avatarArt(chosen)),
                    contentDescription = stringResource(R.string.profile_avatar_description),
                    modifier = Modifier.align(Alignment.BottomStart).padding(start = 14.dp, bottom = 6.dp).size(88.dp),
                )
            }
            Text(stringResource(R.string.profile_tab_avatars), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = colors.violet)
            Column(Modifier.height(230.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ProfileAvatars.all.chunked(4).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { avatar ->
                            val selected = avatar.id == chosen
                            Box(
                                Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (selected) colors.lavender else colors.soft)
                                    .semantics {
                                        contentDescription = avatar.name
                                        this.selected = selected
                                    }
                                    .clickable(role = Role.RadioButton) { chosen = avatar.id }
                                    .padding(6.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Image(painterResource(avatarArt(avatar.id)), null, Modifier.fillMaxWidth())
                            }
                        }
                        repeat(4 - row.size) { Box(Modifier.weight(1f)) }
                    }
                }
            }
            Text(
                ProfileAvatars.resolve(chosen).name,
                style = MaterialTheme.typography.bodyMedium,
                color = colors.muted,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                PaperButton(stringResource(R.string.agenda_cancel), onDismiss, Modifier.weight(1f), PaperButtonStyle.Quiet)
                PaperButton(stringResource(R.string.agenda_save), { onSave(chosen) }, Modifier.weight(1f))
            }
        }
    }
}
