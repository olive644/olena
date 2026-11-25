package olenastudy.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.R
import olenastudy.app.domain.profile.ProfileInfo
import olenastudy.app.domain.profile.ProfileLook
import olenastudy.app.domain.profile.ProfileRules
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.paperPanel
import olenastudy.app.ui.components.paperDigitRes

/** Medidas do site em px CSS (390 de largura): 1 px do site vira 1 dp. Fonte: varredura do /perfil. */
private val ButtonShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val InnerShape = RoundedCornerShape(topStart = 3.dp, topEnd = 11.dp, bottomEnd = 3.dp, bottomStart = 8.dp)
private val ProgressShape = RoundedCornerShape(topStart = 2.dp, topEnd = 6.dp, bottomEnd = 2.dp, bottomStart = 4.dp)

@Composable
fun ProfileScreen(
    themeMode: olenastudy.app.data.settings.ThemeMode,
    look: ProfileLook = ProfileLook(),
    onLookChange: (ProfileLook) -> Unit = {},
    onThemeModeChange: (olenastudy.app.data.settings.ThemeMode) -> Unit = {},
    info: ProfileInfo = ProfileInfo(),
    onInfoChange: (ProfileInfo) -> Unit = {},
    onOpenSettings: () -> Unit = {},
) {
    val colors = OlenaTheme.colors
    var avatarOpen by rememberSaveable { mutableStateOf(false) }
    var editOpen by rememberSaveable { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        CoverCard(look = look, info = info, onAvatar = { avatarOpen = true }, onEdit = { editOpen = true }, onSettings = onOpenSettings)
        Column(Modifier.padding(top = 36.dp)) {
            SectionHeader(title = stringResource(R.string.profile_achievements), titleWidth = 118.dp, count = R.drawable.art_profile_count_a, countDark = R.drawable.art_profile_count_a_dark, countSize = 64.dp to 22.dp, arrowSize = 30.dp, arrowEnd = 6.dp)
            Row(Modifier.padding(top = 24.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                repeat(3) { AchievementSlot(Modifier.weight(1f).height(110.dp)) }
            }
            Box(Modifier.height(54.dp))
            SectionHeader(title = stringResource(R.string.profile_arcana), titleWidth = 71.dp, count = R.drawable.art_profile_count_b, countDark = R.drawable.art_profile_count_b_dark, countSize = 50.dp to 22.dp, arrowSize = 32.dp, arrowEnd = 4.dp)
            Row(Modifier.padding(top = 16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(3) { CardSlot(Modifier.weight(1f)) }
            }
            Box(Modifier.height(130.dp))
        }
    }
    if (editOpen) {
        ProfileEditDialog(
            current = info,
            onDismiss = { editOpen = false },
            onSave = { next ->
                editOpen = false
                onInfoChange(next)
            },
        )
    }
    if (avatarOpen) {
        ProfileAvatarDialog(
            current = look,
            onDismiss = { avatarOpen = false },
            onSave = { next ->
                avatarOpen = false
                onLookChange(next)
            },
        )
    }
}

/** Cartão do topo: capa, avatar, nome, nível, XP, amigos e contagens, com as posições do site. */
@Composable
private fun CoverCard(look: ProfileLook, info: ProfileInfo, onAvatar: () -> Unit, onEdit: () -> Unit, onSettings: () -> Unit) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val line = if (dark) Color(0xFF35313E) else Color(0xFFE6DDC9)
    Box(
        Modifier
            .fillMaxWidth()
            .paperPanel(
                fill = if (dark) Color(0xFF201D26) else Color.White,
                base = line,
                facetLight = Color.Transparent,
                facetDark = Color.Transparent,
                border = line,
                shape = RoundedCornerShape(0.dp),
                radius = 0.dp,
                facet = 0.dp,
                shift = 5.dp,
            ),
    ) {
        Image(painterResource(coverArt(look.coverId)), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(168.dp))
        SiteTile(
            onClick = onSettings,
            description = stringResource(R.string.profile_settings),
            modifier = Modifier.align(Alignment.TopEnd).padding(top = 12.dp, end = 8.dp).size(width = 58.dp, height = 44.dp),
            shift = 3.dp,
        ) { Image(painterResource(R.drawable.art_icon_settings), null, Modifier.size(22.dp)) }
        Box(Modifier.align(Alignment.TopEnd).padding(top = 113.dp, end = 12.dp).size(44.dp), contentAlignment = Alignment.Center) {
            Image(painterResource(R.drawable.art_icon_pen), null, Modifier.size(30.dp))
        }
        Box(Modifier.offset(16.dp, 116.dp).size(112.dp).clickable(role = Role.Button, onClick = onAvatar)) {
            Image(painterResource(avatarArt(look.avatarId)), contentDescription = stringResource(R.string.profile_avatar_description), modifier = Modifier.fillMaxSize())
            frameArt(look.frameId)?.let { Image(painterResource(it), null, Modifier.offset((-13.44).dp, (-13.44).dp).size(138.88.dp)) }
        }
        LevelBadge(Modifier.offset(89.dp, 191.dp))
        Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 237.dp)) {
            Row(Modifier.height(44.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    info.name.ifBlank { stringResource(R.string.profile_title) },
                    fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = colors.text, maxLines = 1,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onEdit).semantics { contentDescription = "Editar perfil" }, contentAlignment = Alignment.Center) {
                    Image(painterResource(R.drawable.art_icon_pen), null, Modifier.size(30.dp))
                }
            }
            if (info.username.isNotBlank() || info.pronouns.isNotBlank()) {
                Text(
                    listOfNotNull(info.username.takeIf { it.isNotBlank() }?.let { "@$it" }, info.pronouns.takeIf { it.isNotBlank() }).joinToString("  "),
                    fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = colors.muted,
                )
            }
            if (info.bio.isNotBlank()) {
                Text(info.bio, fontFamily = ManropeFamily, fontSize = 12.sp, color = colors.text, maxLines = 4, modifier = Modifier.padding(top = 4.dp))
            }
            info.socialLinks.mapNotNull { ProfileRules.recognizeSocialLink(it) }.takeIf { it.isNotEmpty() }?.let { found ->
                Text(found.joinToString("  ") { it.network.label }, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = colors.violet, modifier = Modifier.padding(top = 4.dp))
            }
            Row(Modifier.padding(top = 6.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.art_profile_star), null, Modifier.size(18.dp))
                Text(stringResource(R.string.profile_level), fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 10.4.sp, color = colors.text, modifier = Modifier.padding(start = 6.dp).weight(1f))
                Text(stringResource(R.string.profile_xp), fontFamily = ManropeFamily, fontSize = 10.4.sp, color = colors.text)
            }
            Box(Modifier.padding(top = 4.dp).fillMaxWidth().height(9.dp).clip(ProgressShape).background(line))
            Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SiteButton(Modifier.size(width = 150.dp, height = 44.dp), stringResource(R.string.profile_add_friend)) {
                    Row(Modifier.padding(start = 11.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Image(painterResource(R.drawable.ic_profile_friend), null, Modifier.size(24.dp))
                        Text(stringResource(R.string.profile_add_friend), fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = colors.text, maxLines = 1)
                    }
                }
                SiteButton(Modifier.size(44.dp), stringResource(R.string.profile_qr), Alignment.Center) {
                    Image(painterResource(if (colors.isDark) R.drawable.art_icon_qr_dark else R.drawable.art_icon_qr), null, Modifier.size(width = 15.dp, height = 26.dp))
                }
            }
            Row(Modifier.padding(top = 6.dp, bottom = 21.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                CountChip(Modifier.size(width = 114.dp, height = 44.dp), R.drawable.ic_profile_followers, stringResource(R.string.profile_followers))
                CountChip(Modifier.size(width = 104.dp, height = 44.dp), R.drawable.ic_profile_following, stringResource(R.string.profile_following))
            }
        }
    }
}

@Composable
private fun LevelBadge(modifier: Modifier) {
    Box(
        modifier = modifier
            .size(width = 48.dp, height = 42.dp)
            .drawBehind {
                val w = size.width
                val h = size.height
                drawPath(
                    Path().apply { moveTo(0f, 0f); lineTo(w, 0f); lineTo(w, h * 0.72f); lineTo(w / 2, h); lineTo(0f, h * 0.72f); close() },
                    Color(0xFFFACC15),
                )
            },
    ) {
        Text("NV", fontFamily = ManropeFamily, fontWeight = FontWeight.Black, fontSize = 8.8.sp, color = Color(0xFF292432), modifier = Modifier.offset(8.dp, 11.dp))
        Image(painterResource(paperDigitRes(1, false)), null, Modifier.offset(24.dp, 9.dp).size(width = 16.dp, height = 24.dp))
    }
}

/** Botão secundário do site: fundo claro em relevo, base de 4 dp e faceta no canto. */
@Composable
private fun SiteButton(modifier: Modifier, description: String, align: Alignment = Alignment.CenterStart, content: @Composable BoxScope.() -> Unit) {
    val dark = OlenaTheme.colors.isDark
    val line = if (dark) Color(0xFF35313E) else Color(0xFFE6DDC9)
    Box(
        modifier = modifier
            .semantics { contentDescription = description }
            .paperPanel(
                fill = if (dark) Color(0xFF201D26) else Color.White,
                base = line,
                facetLight = if (dark) Color(0xFF262230) else Color(0xFFFBF2E2),
                facetDark = Color.Transparent,
                border = line,
                shape = ButtonShape,
                radius = 13.dp,
                facet = 14.dp,
                shift = 4.dp,
            )
            .clickable(role = Role.Button) {},
        contentAlignment = align,
        content = content,
    )
}

/** Gengrenagem (Configurações): peça creme com base de 3 dp, igual ao botão do cabeçalho do site. */
@Composable
private fun SiteTile(onClick: () -> Unit, description: String, modifier: Modifier, shift: Dp, content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier = modifier
            .semantics { contentDescription = description }
            .paperPanel(
                fill = Color(0xFFFFF9EF),
                base = Color(0xFFC8BAA4),
                facetLight = Color(0xFFE9DDC6),
                facetDark = Color.Transparent,
                border = Color(0xFFD7CBB7),
                shape = ButtonShape,
                radius = 13.dp,
                facet = 16.dp,
                shift = shift,
            )
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content,
    )
}

@Composable
private fun CountChip(modifier: Modifier, icon: Int, label: String) {
    val colors = OlenaTheme.colors
    Row(
        modifier.clip(ButtonShape).background(if (colors.isDark) Color(0xFF262230) else Color(0xFFFBF2E2)).padding(start = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Image(painterResource(icon), null, Modifier.size(20.dp))
        Text(label, fontFamily = ManropeFamily, fontSize = 11.2.sp, color = colors.text, maxLines = 1)
    }
}

@Composable
private fun SectionHeader(title: String, titleWidth: Dp, count: Int, countDark: Int, countSize: Pair<Dp, Dp>, arrowSize: Dp, arrowEnd: Dp) {
    val colors = OlenaTheme.colors
    Row(Modifier.fillMaxWidth().height(44.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 18.4.sp, color = colors.text, maxLines = 1, modifier = Modifier.width(titleWidth))
        Image(painterResource(if (colors.isDark) countDark else count), null, Modifier.size(width = countSize.first, height = countSize.second))
        Box(Modifier.weight(1f))
        Image(painterResource(R.drawable.ic_paper_arrow), null, Modifier.padding(end = arrowEnd).size(arrowSize))
    }
}

/** Vaga de conquista vazia: fundo creme, borda e um "+", como no site. */
@Composable
private fun AchievementSlot(modifier: Modifier) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val line = if (dark) Color(0xFF35313E) else Color(0xFFE6DDC9)
    Box(
        modifier
            .clip(ButtonShape)
            .background(if (dark) Color(0xFF262230) else Color(0xFFFBF2E2))
            .drawBehind {
                val cut = 34.dp.toPx()
                drawPath(Path().apply { moveTo(0f, 0f); lineTo(cut, 0f); lineTo(0f, cut); close() }, line.copy(alpha = 0.35f))
                drawRoundRect(color = line, cornerRadius = CornerRadius(11.dp.toPx()), style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 5f))))
            },
        contentAlignment = Alignment.Center,
    ) {
        Image(painterResource(if (dark) R.drawable.art_profile_plus_dark else R.drawable.art_profile_plus), null, Modifier.size(31.dp))
    }
}

/** Vaga de carta do Arcano: peça de 122 x 220 com o miolo de 110 x 189 e o rótulo "Favorita". */
@Composable
private fun CardSlot(modifier: Modifier) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    val line = if (dark) Color(0xFF35313E) else Color(0xFFE6DDC9)
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier
                .padding(top = 4.dp)
                .size(width = 110.dp, height = 189.dp)
                .clip(InnerShape)
                .background(if (dark) Color(0xFF262230) else Color(0xFFFBF2E2))
                .drawBehind { drawRoundRect(color = line, cornerRadius = CornerRadius(10.dp.toPx()), style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 5f)))) },
        ) {
            Image(painterResource(if (dark) R.drawable.art_profile_plus_card_dark else R.drawable.art_profile_plus_card), null, Modifier.fillMaxSize())
        }
        Text(
            stringResource(R.string.profile_favorite),
            fontFamily = ManropeFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 11.52.sp,
            color = colors.text,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
