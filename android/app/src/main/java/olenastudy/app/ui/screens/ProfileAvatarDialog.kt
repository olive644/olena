package olenastudy.app.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
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
import androidx.compose.ui.window.DialogProperties
import olenastudy.app.R
import olenastudy.app.domain.profile.Cosmetic
import olenastudy.app.domain.profile.ProfileAvatars
import olenastudy.app.domain.profile.ProfileCosmetics
import olenastudy.app.domain.profile.ProfileCosmetics.Kind
import olenastudy.app.domain.profile.ProfileLook
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.paperPanel

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

@Composable
private fun drawableByName(name: String): Int {
    val context = LocalContext.current
    return context.resources.getIdentifier(name, "drawable", context.packageName)
}

/** Arte da capa (header) do perfil. A "Noite da Olena" é o vetor do site, as outras vêm do site em PNG. */
@Composable
fun coverArt(id: String): Int = if (id == "helena") R.drawable.ic_profile_cover else drawableByName("art_cover_$id").takeIf { it != 0 } ?: R.drawable.ic_profile_cover

/** Arte da moldura sobre o avatar. `none` não tem arte. */
@Composable
fun frameArt(id: String): Int? = if (id == "none") null else drawableByName("art_frame_$id").takeIf { it != 0 }

private val DialogShape = RoundedCornerShape(topStart = 22.dp, topEnd = 38.dp, bottomEnd = 24.dp, bottomStart = 30.dp)
private val CardShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val Ink = Color(0xFF292432)
private val CreamLine = Color(0xFFD7CBB7)
private val CreamBase = Color(0xFFC8BAA4)

private enum class Tab(val label: Int) {
    Avatar(R.string.profile_tab_avatars),
    Frame(R.string.profile_tab_frames),
    Cover(R.string.profile_tab_headers),
    Background(R.string.profile_tab_background),
}

/** "Personalize seu perfil": pré-visualização, quatro abas e a grade de opções, com as medidas do site. */
@Composable
fun ProfileAvatarDialog(current: ProfileLook, onDismiss: () -> Unit, onSave: (ProfileLook) -> Unit, earned: Set<String> = emptySet(), startOnCovers: Boolean = false) {
    var look by rememberSaveable(stateSaver = LookSaver) { mutableStateOf(current) }
    var tabName by rememberSaveable { mutableStateOf(if (startOnCovers) Tab.Cover.name else Tab.Avatar.name) }
    val tab = Tab.valueOf(tabName)
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            Modifier
                .padding(horizontal = 19.dp, vertical = 40.dp)
                .fillMaxWidth()
                .clip(DialogShape)
                .background(Dlg.bg)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 17.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(Modifier.fillMaxWidth().height(44.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.profile_customize_title), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = OlenaTheme.colors.text, modifier = Modifier.weight(1f))
                Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onDismiss).semantics { contentDescription = "Fechar" }, contentAlignment = Alignment.Center) {
                    Image(painterResource(R.drawable.art_close), null, Modifier.size(28.dp))
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Dlg.line))
            Box(Modifier.fillMaxWidth().height(96.dp).clip(RoundedCornerShape(topStart = 4.dp, topEnd = 20.dp, bottomEnd = 4.dp, bottomStart = 12.dp)).background(Color.White).profileBackground(look.backgroundId)) {
                Image(painterResource(coverArt(look.coverId)), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(64.dp))
                Box(Modifier.align(Alignment.TopCenter).padding(top = 24.dp).size(64.dp)) {
                    Image(
                        painterResource(avatarArt(look.avatarId)), stringResource(R.string.profile_avatar_description),
                        Modifier.size(64.dp),
                    )
                    frameArt(look.frameId)?.let { Image(painterResource(it), null, Modifier.align(Alignment.Center).requiredSize(79.36.dp)) }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Tab.entries.chunked(2).forEach { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        pair.forEach { t -> TabButton(stringResource(t.label), t == tab, Modifier.weight(1f)) { tabName = t.name } }
                    }
                }
            }
            when (tab) {
                Tab.Avatar -> AvatarPicker(look.avatarId) { look = look.copy(avatarId = it) }
                Tab.Frame -> OptionGrid(Kind.Frame, ProfileCosmetics.frames, look, earned) { look = look.copy(frameId = it) }
                Tab.Cover -> OptionGrid(Kind.Cover, ProfileCosmetics.covers, look, earned) { look = look.copy(coverId = it) }
                Tab.Background -> OptionGrid(Kind.Background, ProfileCosmetics.backgrounds, look, earned) { look = look.copy(backgroundId = it) }
            }
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.End)) {
                PaperButton(stringResource(R.string.agenda_cancel), onDismiss, Modifier.weight(1f), PaperButtonStyle.Quiet)
                PaperButton(stringResource(R.string.profile_use_character), { onSave(look) }, Modifier.weight(1.4f))
            }
        }
    }
}

@Composable
private fun TabButton(label: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .height(44.dp)
            .semantics { this.selected = selected }
            .paperPanel(
                fill = if (selected) Color(0xFFFACC15) else Dlg.secondary,
                base = if (selected) Color(0xFFB88C13) else Dlg.line,
                facetLight = if (selected) Color(0xFFFFE066) else Dlg.secondaryFacet,
                facetDark = Color.Transparent,
                border = if (selected) Color(0xFFE4BD35) else Dlg.line,
                shape = CardShape,
                radius = 13.dp,
                facet = 14.dp,
                shift = 4.dp,
            )
            .clickable(role = Role.Tab, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = if (selected) Color(0xFF17151C) else OlenaTheme.colors.text)
    }
}

/** Seção creme "Quem está estudando?" com os 16 avatares em 3 colunas de cartões 88 dp. */
@Composable
private fun AvatarPicker(selectedId: String, onPick: (String) -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .paperPanel(
                fill = Color(0xFFFFF9EF),
                base = Color.Transparent,
                facetLight = Color(0xFFEEE5D5),
                facetDark = Color(0xFFEEE5D5),
                border = CreamLine,
                shape = RoundedCornerShape(topStart = 9.dp, topEnd = 22.dp, bottomEnd = 12.dp, bottomStart = 18.dp),
                radius = 22.dp,
                facet = 34.dp,
                shift = 0.dp,
            )
            .padding(17.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(stringResource(R.string.profile_who_studies), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Ink)
        ProfileAvatars.all.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { avatar ->
                    val selected = avatar.id == selectedId
                    Column(
                        Modifier
                            .weight(1f)
                            .semantics { contentDescription = avatar.name; this.selected = selected }
                            .paperPanel(
                                fill = if (selected) Color(0xFFFACC15) else Color.White,
                                base = CreamBase,
                                facetLight = Color.Transparent,
                                facetDark = Color.Transparent,
                                border = if (selected) Color(0xFFC9BBA2) else CreamLine,
                                shape = CardShape,
                                radius = 13.dp,
                                facet = 0.dp,
                                shift = 3.dp,
                            )
                            .clickable(role = Role.RadioButton) { onPick(avatar.id) }
                            .padding(horizontal = 4.dp, vertical = 9.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Image(painterResource(avatarArt(avatar.id)), null, Modifier.size(64.dp))
                        Text(avatar.name, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 11.52.sp, color = Ink, textAlign = TextAlign.Center, maxLines = 2)
                    }
                }
                repeat(3 - row.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

/** Molduras, headers e fundos: cartões brancos de 2 colunas com a arte, o nome e, se travado, a dica. */
@Composable
private fun OptionGrid(kind: Kind, items: List<Cosmetic>, look: ProfileLook, earned: Set<String>, onPick: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                row.forEach { item ->
                    val unlocked = ProfileCosmetics.unlocked(kind, item.id, earned)
                    val selected =
                        when (kind) {
                            Kind.Frame -> look.frameId == item.id
                            Kind.Cover -> look.coverId == item.id
                            Kind.Background -> look.backgroundId == item.id
                        }
                    Column(
                        Modifier
                            .weight(1f)
                            .semantics { contentDescription = item.name; this.selected = selected }
                            .paperPanel(
                                fill = if (selected) Color(0xFFFACC15) else Dlg.secondary,
                                base = Dlg.line,
                                facetLight = Color.Transparent,
                                facetDark = Color.Transparent,
                                border = Dlg.line,
                                shape = CardShape,
                                radius = 13.dp,
                                facet = 0.dp,
                                shift = 3.dp,
                            )
                            .clickable(enabled = unlocked, role = Role.RadioButton) { onPick(item.id) }
                            .padding(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Box(Modifier.fillMaxWidth().height(70.dp), contentAlignment = Alignment.Center) {
                            when (kind) {
                                Kind.Cover -> Image(painterResource(coverArt(item.id)), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(58.dp).clip(RoundedCornerShape(8.dp)))
                                Kind.Frame -> {
                                    Image(painterResource(avatarArt(look.avatarId)), null, Modifier.size(56.dp))
                                    frameArt(item.id)?.let { Image(painterResource(it), null, Modifier.size(70.dp)) }
                                }
                                Kind.Background -> BackgroundSwatch(item.id)
                            }
                        }
                        Text(
                            item.name + if (selected) " ✓" else "",
                            fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 11.52.sp, color = if (selected) Ink else OlenaTheme.colors.text, textAlign = TextAlign.Center, maxLines = 2,
                        )
                        if (!unlocked) {
                            Text(ProfileCosmetics.lockedHint(kind, item.id), fontFamily = ManropeFamily, fontSize = 10.sp, color = OlenaTheme.colors.muted, textAlign = TextAlign.Center)
                        }
                    }
                }
                repeat(2 - row.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

/** Amostra de fundo: a arte do site quando existe; "Papel original", "Céu de papel" e "Caderno geométrico" são cores. */
@Composable
private fun BackgroundSwatch(id: String) {
    val shape = RoundedCornerShape(8.dp)
    Box(Modifier.size(width = 52.dp, height = 62.dp).clip(shape).background(Color(0xFFFFF9EF)).profileBackground(id).paperPanel(Color.Transparent, Color.Transparent, Color.Transparent, Color.Transparent, CreamLine, shape, 8.dp, 0.dp, 0.dp))
}

private val LookSaver =
    androidx.compose.runtime.saveable.listSaver<ProfileLook, String>(
        save = { listOf(it.avatarId, it.frameId, it.coverId, it.backgroundId) },
        restore = { ProfileLook(it[0], it[1], it[2], it[3]) },
    )
