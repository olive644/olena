package olenastudy.app.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs
import kotlinx.coroutines.launch
import olenastudy.app.R
import olenastudy.app.domain.practice.PracticeIsland
import olenastudy.app.domain.practice.PracticeIslands
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.LocalHighlightSelections
import olenastudy.app.ui.LocalReduceMotion
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle

@DrawableRes
private fun art(id: String): Int =
    when (id) {
        "english" -> R.drawable.art_island_english
        "portuguese" -> R.drawable.art_island_portuguese
        "chemistry" -> R.drawable.art_island_chemistry
        "biology" -> R.drawable.art_island_biology
        "mathematics" -> R.drawable.art_island_mathematics
        "programming" -> R.drawable.art_island_programming
        "spanish" -> R.drawable.art_island_spanish
        "japanese" -> R.drawable.art_island_japanese
        else -> R.drawable.art_island_chinese
    }

/**
 * Entrada da aba Praticar com Matemática no centro. A rodada visitante usa o currículo da web;
 * as demais atividades informam sua disponibilidade.
 */
@Composable
fun PracticeScreen(avatarId: String = "helena", onOpenAccount: () -> Unit = {}) {
    var mathematics by rememberSaveable { mutableStateOf(false) }
    if (mathematics) {
        MathPracticeScreen(avatarId, onBack = { mathematics = false }, onOpenAccount = onOpenAccount)
        return
    }
    val colors = OlenaTheme.colors
    val pager = rememberPagerState(initialPage = PracticeIslands.startIndex) { PracticeIslands.all.size }
    val scope = rememberCoroutineScope()
    val reduceMotion = LocalReduceMotion.current
    var notice by remember { mutableStateOf<PracticeIsland?>(null) }
    val current = PracticeIslands.all[pager.currentPage]

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(top = 12.dp, bottom = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.fillMaxWidth().height(330.dp), contentAlignment = Alignment.Center) {
            HorizontalPager(
                state = pager,
                contentPadding = PaddingValues(horizontal = 56.dp),
                pageSpacing = (-40).dp,
                modifier = Modifier.fillMaxSize(),
            ) { page ->
                val offset = abs((pager.currentPage - page) + pager.currentPageOffsetFraction)
                Image(
                    painter = painterResource(art(PracticeIslands.all[page].id)),
                    contentDescription = stringResource(R.string.practice_enter, PracticeIslands.all[page].title),
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            val scale = 1f - 0.18f * offset.coerceAtMost(1f)
                            scaleX = scale
                            scaleY = scale
                            alpha = 1f - 0.55f * offset.coerceAtMost(1f)
                        },
                )
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Arrow(R.drawable.art_arrow_prev, pager.currentPage > 0, stringResource(R.string.practice_previous)) {
                    scope.launch { if (reduceMotion) pager.scrollToPage(pager.currentPage - 1) else pager.animateScrollToPage(pager.currentPage - 1) }
                }
                Box(Modifier.weight(1f))
                Arrow(R.drawable.art_arrow_next, pager.currentPage < PracticeIslands.all.lastIndex, stringResource(R.string.practice_next)) {
                    scope.launch { if (reduceMotion) pager.scrollToPage(pager.currentPage + 1) else pager.animateScrollToPage(pager.currentPage + 1) }
                }
            }
        }
        Text(current.subject.uppercase(), style = MaterialTheme.typography.titleMedium, letterSpacing = 1.5.sp, color = colors.violet)
        Text(current.title, fontFamily = ManropeFamily, fontWeight = FontWeight.Bold, fontSize = 28.sp, color = colors.text, textAlign = TextAlign.Center)
        Text(current.description, style = MaterialTheme.typography.bodyLarge, color = colors.muted, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 24.dp))
        PaperButton(
            text = if (current.available) stringResource(R.string.practice_explore, current.subject) else stringResource(R.string.practice_preparing),
            onClick = { if (current.id == "mathematics") mathematics = true else if (current.available) notice = current },
            modifier = Modifier.padding(top = 8.dp),
            style = if (current.available) PaperButtonStyle.Primary else PaperButtonStyle.Quiet,
            enabled = current.available,
        )
    }
    notice?.let { island ->
        AlertDialog(
            onDismissRequest = { notice = null },
            title = { Text(island.title) },
            text = { Text(stringResource(R.string.practice_lessons_notice, island.subject)) },
            confirmButton = { PaperButton(stringResource(R.string.practice_ok), { notice = null }) },
        )
    }
}

@Composable
private fun Arrow(@DrawableRes art: Int, enabled: Boolean, description: String, onClick: () -> Unit) {
    val source = remember { MutableInteractionSource() }
    val focused by source.collectIsFocusedAsState()
    val color = if (LocalHighlightSelections.current) OlenaTheme.colors.yellow else OlenaTheme.colors.text
    Image(
        painter = painterResource(art),
        contentDescription = description,
        modifier = Modifier.width(48.dp).height(52.dp).drawBehind {
            if (focused) drawLine(color, Offset(8.dp.toPx(), size.height - 2.dp.toPx()), Offset(size.width - 8.dp.toPx(), size.height - 2.dp.toPx()), 3.dp.toPx())
        }.clickable(enabled = enabled, interactionSource = source, indication = null, role = Role.Button, onClick = onClick),
        alpha = if (enabled) 1f else 0.3f,
    )
}
