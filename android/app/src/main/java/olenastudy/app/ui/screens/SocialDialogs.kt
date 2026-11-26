package olenastudy.app.ui.screens

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import olenastudy.app.R
import olenastudy.app.domain.profile.ProfileLook
import olenastudy.app.domain.profile.ProfileShare
import olenastudy.app.domain.qr.QrCode
import olenastudy.app.domain.qr.QrLevel
import olenastudy.app.domain.qr.QrMatrix
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.paperPanel

/** Medidas do site (px CSS = dp): .social-directory, .social-share-card e .secondary-button, 390 de largura. */
private val DialogShape = RoundedCornerShape(topStart = 8.dp, topEnd = 28.dp, bottomEnd = 8.dp, bottomStart = 16.dp)
private val ButtonShape = RoundedCornerShape(topStart = 5.dp, topEnd = 13.dp, bottomEnd = 6.dp, bottomStart = 11.dp)
private val InputShape = RoundedCornerShape(topStart = 4.dp, topEnd = 14.dp, bottomEnd = 4.dp, bottomStart = 8.dp)
private val CardShape = RoundedCornerShape(topStart = 5.dp, topEnd = 26.dp, bottomEnd = 5.dp, bottomStart = 16.dp)
private val Cream = Color(0xFFFFF9EF)
private val CardInk = Color(0xFF292432)

private class SocialPalette(val dark: Boolean) {
    val line = if (dark) Color(0xFF35313E) else Color(0xFFE6DDC9)
    val surface = if (dark) Color(0xFF262230) else Color.White
    val button = if (dark) Color(0xFF201D26) else Color.White
    val facet = if (dark) Color(0xFF262230) else Color(0xFFFBF2E2)
    val soft = if (dark) Color(0xFF262230) else Color(0xFFFBF2E2)
    val inputFill = if (dark) Color(0xFF292432) else Color.White
    val inputLine = if (dark) Color(0xFF51465D) else Color(0xFFE6DDC9)
    val text = if (dark) Color(0xFFF4F2EE) else Color(0xFF0F0F14)
    val placeholder = if (dark) Color(0xFFA9A2B0) else Color(0xFF6B6570)
}

@Composable
private fun palette() = SocialPalette(OlenaTheme.colors.isDark)

/** Moldura dos diálogos sociais (`dialog.social-directory`): papel com base de 7 dp, título e X no topo. */
@Composable
fun SocialDialogSurface(title: String, closeLabel: String, onClose: () -> Unit, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val p = palette()
    Column(
        modifier
            .fillMaxWidth()
            .paperPanel(fill = p.surface, base = p.line, facetLight = Color.Transparent, facetDark = Color.Transparent, border = p.line, shape = DialogShape, radius = 28.dp, facet = 0.dp, shift = 7.dp)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
    ) {
        Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 22.4.sp, color = p.text, modifier = Modifier.weight(1f))
            Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onClose).semantics { contentDescription = closeLabel }, contentAlignment = Alignment.Center) {
                Image(painterResource(R.drawable.art_close), null, Modifier.size(28.dp))
            }
        }
        Spacer(Modifier.height(18.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(p.line))
        Spacer(Modifier.height(24.dp))
        content()
    }
}

@Composable
private fun SocialDialog(title: String, closeLabel: String, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        SocialDialogSurface(title, closeLabel, onDismiss, Modifier.padding(horizontal = 19.dp, vertical = 40.dp), content)
    }
}

/** `.secondary-button`: papel claro com faceta no canto e base de 4 dp; o selecionado fica amarelo. */
@Composable
private fun SocialButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, selected: Boolean? = null, gap: Dp = 12.dp, content: @Composable RowScope.() -> Unit) {
    val p = palette()
    val on = selected == true
    Row(
        modifier
            .alpha(if (enabled) 1f else 0.45f)
            .paperPanel(
                fill = if (on) Color(0xFFFACC15) else p.button,
                base = if (on) Color(0xFFB88C13) else p.line,
                facetLight = if (on) Color.Transparent else p.facet,
                facetDark = Color.Transparent,
                border = if (on) Color(0xFFB88C13) else p.line,
                shape = ButtonShape,
                radius = 13.dp,
                facet = 10.dp,
                shift = 4.dp,
            )
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .then(if (selected != null) Modifier.semantics { this.selected = selected } else Modifier)
            .padding(horizontal = 13.6.dp, vertical = 10.4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(gap),
        content = content,
    )
}

@Composable
private fun ButtonLabel(text: String) {
    Text(text, fontFamily = ManropeFamily, fontWeight = FontWeight.ExtraBold, fontSize = 12.16.sp, color = palette().text, maxLines = 1)
}

/** Caixa de aviso do diálogo: fundo suave e barra rosa de 4 dp à esquerda. */
@Composable
private fun SocialAlert(text: String) {
    val p = palette()
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min).background(p.soft)) {
        Box(Modifier.width(4.dp).fillMaxHeight().background(Color(0xFFED729D)))
        Text(text, fontFamily = ManropeFamily, fontSize = 16.sp, color = p.text, modifier = Modifier.weight(1f).padding(12.dp))
    }
}

// ---------------------------------------------------------------------------------------------
// Encontre seus amigos
// ---------------------------------------------------------------------------------------------

/**
 * Conteúdo de "Encontre seus amigos". Sem conta o app não consulta ninguém: o aviso é o do site
 * para quem não entrou ("Entre na conta para adicionar amigos."), sem fingir busca nem envio.
 */
@Composable
fun FriendsContent(query: String, onQueryChange: (String) -> Unit, message: String?, onSearch: () -> Unit, onOpenShare: () -> Unit, searchFocus: FocusRequester = remember { FocusRequester() }) {
    val p = palette()
    Column {
        val actions = stringResource(R.string.social_actions)
        Column(Modifier.fillMaxWidth().padding(vertical = 12.dp).semantics { contentDescription = actions }, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SocialButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth().heightIn(min = 47.dp)) {
                Image(painterResource(R.drawable.art_friends_contacts), null, Modifier.size(24.dp))
                ButtonLabel(stringResource(R.string.social_contacts))
            }
            SocialButton(onClick = { searchFocus.requestFocus() }, modifier = Modifier.fillMaxWidth().heightIn(min = 47.dp)) {
                Image(painterResource(R.drawable.art_friends_search), null, Modifier.size(24.dp))
                ButtonLabel(stringResource(R.string.social_search_by_name))
            }
            SocialButton(onClick = onOpenShare, modifier = Modifier.fillMaxWidth().heightIn(min = 53.dp)) {
                Image(painterResource(if (p.dark) R.drawable.art_friends_share_dark else R.drawable.art_friends_share_light), null, Modifier.size(24.dp))
                ButtonLabel(stringResource(R.string.social_share_profile))
            }
        }
        Text(stringResource(R.string.social_search_label), fontFamily = ManropeFamily, fontSize = 16.sp, color = p.text)
        Row(Modifier.padding(top = 0.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                Modifier
                    .weight(1f)
                    .height(48.dp)
                    .paperPanel(fill = p.inputFill, base = p.line, facetLight = Color.Transparent, facetDark = Color.Transparent, border = p.inputLine, shape = InputShape, radius = 14.dp, facet = 0.dp, shift = 3.dp)
                    .padding(horizontal = 14.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                BasicTextField(
                    value = query,
                    onValueChange = { onQueryChange(it.take(80)) },
                    singleLine = true,
                    textStyle = TextStyle(fontFamily = ManropeFamily, fontSize = 16.sp, color = if (p.dark) Cream else p.text),
                    cursorBrush = SolidColor(p.text),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { onSearch() }),
                    modifier = Modifier.fillMaxWidth().focusRequester(searchFocus),
                    decorationBox = { inner ->
                        if (query.isEmpty()) Text(stringResource(R.string.social_search_placeholder), fontFamily = ManropeFamily, fontSize = 16.sp, color = p.placeholder)
                        inner()
                    },
                )
            }
            SocialButton(onClick = onSearch, modifier = Modifier.height(44.dp)) { ButtonLabel(stringResource(R.string.social_search_button)) }
        }
        if (message != null) {
            Spacer(Modifier.height(0.dp))
            SocialAlert(message)
        }
    }
}

@Composable
fun FriendsDialog(onDismiss: () -> Unit, onOpenShare: () -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    val message = stringResource(R.string.social_needs_account)
    SocialDialog(stringResource(R.string.social_title), stringResource(R.string.social_close), onDismiss) {
        FriendsContent(query, { query = it }, message, onSearch = {}, onOpenShare = onOpenShare)
    }
}

// ---------------------------------------------------------------------------------------------
// Seguidores e Seguindo
// ---------------------------------------------------------------------------------------------

enum class ConnectionKind { Followers, Following }

/** Lista de conexões: alternância Seguindo/Seguidores e o estado vazio do site (sem conta, a lista é vazia de verdade). */
@Composable
fun ConnectionsContent(kind: ConnectionKind, onKind: (ConnectionKind) -> Unit, onBack: () -> Unit) {
    val p = palette()
    val listLabel = stringResource(R.string.social_list_label)
    val backLabel = stringResource(R.string.social_back)
    val toggleLabel = stringResource(R.string.social_list_toggle)
    Column(Modifier.semantics { contentDescription = listLabel }) {
        Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onBack).semantics { contentDescription = backLabel }, contentAlignment = Alignment.Center) {
            Image(painterResource(R.drawable.art_arrow_prev), null, Modifier.size(32.dp))
        }
        Row(
            Modifier.fillMaxWidth().padding(vertical = 12.dp).semantics { contentDescription = toggleLabel },
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        ) {
            listOf(ConnectionKind.Following to R.string.profile_following, ConnectionKind.Followers to R.string.profile_followers).forEach { (item, label) ->
                SocialButton(onClick = { onKind(item) }, selected = kind == item) { ButtonLabel(stringResource(label)) }
            }
        }
        Text(
            stringResource(if (kind == ConnectionKind.Followers) R.string.social_no_followers else R.string.social_no_following),
            fontFamily = ManropeFamily, fontSize = 16.sp, color = p.text,
        )
    }
}

@Composable
fun ConnectionsDialog(initial: ConnectionKind, onDismiss: () -> Unit, onBack: () -> Unit) {
    var kind by rememberSaveable { mutableStateOf(initial) }
    SocialDialog(stringResource(R.string.social_title), stringResource(R.string.social_close), onDismiss) {
        ConnectionsContent(kind, { kind = it }, onBack)
    }
}

// ---------------------------------------------------------------------------------------------
// Cartão de compartilhar perfil
// ---------------------------------------------------------------------------------------------

/** QR do perfil, gerado no aparelho: células arredondadas, três finders de papel e a estrela no centro, como o site. */
@Composable
fun ProfileQr(matrix: QrMatrix, size: Dp, description: String) {
    Box(Modifier.size(size).semantics { contentDescription = description }) {
        Canvas(Modifier.size(size)) {
            val total = this.size.width
            val count = matrix.size
            val quiet = total * 4f / (count + 8)
            val cell = (total - quiet * 2) / count
            drawRect(Cream)
            fun finder(x: Float, y: Float, side: Float, color: Color, radius: Float) =
                drawRoundRect(color, Offset(x, y), Size(side, side), CornerRadius(radius))
            for (row in 0 until count) for (column in 0 until count) {
                val inFinder = (row < 7 && column < 7) || (row < 7 && column >= count - 7) || (row >= count - 7 && column < 7)
                if (inFinder || !matrix.dark(row, column)) continue
                drawRoundRect(CardInk, Offset(quiet + column * cell, quiet + row * cell), Size(cell, cell), CornerRadius(cell * 0.18f))
            }
            for ((column, row) in listOf(0 to 0, count - 7 to 0, 0 to count - 7)) {
                val x = quiet + column * cell
                val y = quiet + row * cell
                finder(x, y, cell * 7, Color(0xFF0B5C66), cell * 0.12f)
                finder(x + cell, y + cell, cell * 5, Cream, cell * 0.1f)
                finder(x + cell * 2, y + cell * 2, cell * 3, CardInk, cell * 0.08f)
            }
        }
        val logo = size * (1 - 8f / (matrix.size + 8)) * 0.24f
        Image(painterResource(R.drawable.art_friends_logo), null, Modifier.align(Alignment.Center).size(logo))
    }
}

/**
 * Cartão do perfil (`.social-share-card`): capa, marca, avatar com nível, nome, @, QR e a frase
 * "Vamos estudar juntos?". Sem conta não há @: o QR abre o OlenaStudy e o aviso diz isso.
 */
@Composable
fun ShareCardContent(
    name: String,
    username: String,
    look: ProfileLook,
    link: String,
    status: String?,
    onBack: () -> Unit,
    onCopy: () -> Unit,
    onShare: () -> Unit,
) {
    val p = palette()
    val matrix = remember(link) { QrCode.encode(link, QrLevel.H) }
    Column {
        SocialButton(onClick = onBack) {
            Image(painterResource(R.drawable.art_arrow_prev), null, Modifier.size(24.dp))
            ButtonLabel(stringResource(R.string.social_back_to_friends))
        }
        Box(Modifier.padding(vertical = 20.dp).fillMaxWidth().clip(CardShape).background(Color(0xFFCFC4AF)).padding(bottom = 6.dp)) {
            Box(Modifier.fillMaxWidth().background(Cream)) {
                Image(painterResource(coverArt(look.coverId)), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(120.dp))
                Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        stringResource(R.string.share_brand),
                        fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Cream,
                        style = TextStyle(shadow = Shadow(CardInk, Offset(0f, 2f), 0f)),
                        modifier = Modifier.fillMaxWidth().height(22.dp),
                    )
                    Spacer(Modifier.height(16.dp))
                    Box(Modifier.size(160.dp)) {
                        Image(painterResource(avatarArt(look.avatarId)), contentDescription = null, modifier = Modifier.fillMaxSize())
                        frameArt(look.frameId)?.let { Image(painterResource(it), null, Modifier.align(Alignment.Center).requiredSize(198.4.dp)) }
                        LevelBadge(Modifier.offset(104.dp, 107.dp))
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(name, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 18.72.sp, color = CardInk, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 0.dp))
                    if (username.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Text("@$username", fontFamily = ManropeFamily, fontSize = 16.sp, color = CardInk, textAlign = TextAlign.Center)
                    }
                    Spacer(Modifier.height(18.dp))
                    ProfileQr(matrix, 180.dp, stringResource(R.string.share_qr_description))
                    Spacer(Modifier.height(6.dp))
                    Text(stringResource(R.string.share_tagline), fontFamily = ManropeFamily, fontSize = 16.sp, color = CardInk, textAlign = TextAlign.Center)
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) {
            val copy = stringResource(R.string.share_copy)
            val send = stringResource(R.string.share_send)
            SocialButton(onClick = onCopy, modifier = Modifier.height(44.dp).semantics { contentDescription = copy }) {
                Image(painterResource(R.drawable.art_friends_copy), null, Modifier.size(24.dp))
            }
            SocialButton(onClick = onShare, modifier = Modifier.height(44.dp).semantics { contentDescription = send }) {
                Image(painterResource(if (p.dark) R.drawable.art_friends_share_dark else R.drawable.art_friends_share_light), null, Modifier.size(24.dp))
            }
        }
        if (status != null) Text(status, fontFamily = ManropeFamily, fontSize = 16.sp, color = p.text, modifier = Modifier.padding(top = 12.dp).fillMaxWidth(), textAlign = TextAlign.Center)
        if (username.isBlank()) Text(stringResource(R.string.share_no_handle), fontFamily = ManropeFamily, fontSize = 12.sp, color = p.placeholder, modifier = Modifier.padding(top = 12.dp).fillMaxWidth(), textAlign = TextAlign.Center)
    }
}

/** Diálogo do cartão: copiar usa a área de transferência e compartilhar abre o seletor do sistema (ACTION_SEND). */
@Composable
fun ProfileShareDialog(name: String, username: String, look: ProfileLook, onBack: () -> Unit, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val link = remember(username) { ProfileShare.link(username) }
    var status by rememberSaveable { mutableStateOf<Int?>(null) }
    val title = stringResource(R.string.share_title, name)
    val tagline = stringResource(R.string.share_tagline)
    SocialDialog(stringResource(R.string.social_share_profile), stringResource(R.string.social_close), onDismiss) {
        ShareCardContent(
            name = name, username = username, look = look, link = link,
            status = status?.let { stringResource(it) },
            onBack = onBack,
            onCopy = { status = if (copyToClipboard(context, link)) R.string.share_copied else R.string.share_copy_failed },
            onShare = { if (!sendLink(context, title, ProfileShare.shareText(tagline, link))) status = R.string.share_send_failed },
        )
    }
}

private fun copyToClipboard(context: Context, text: String): Boolean =
    try {
        context.getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("OlenaStudy", text))
        true
    } catch (_: RuntimeException) {
        false
    }

private fun sendLink(context: Context, title: String, text: String): Boolean {
    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, text)
    return try {
        context.startActivity(Intent.createChooser(send, title).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
    } catch (_: ActivityNotFoundException) {
        false
    }
}
