package olenastudy.app.ui.screens

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.background
import olenastudy.app.R
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperDigits
import olenastudy.app.ui.components.paperPanel

/** Dados do "Espaço do aluno" que vêm do aparelho: o que o aluno fez hoje. */
data class HomeSummary(
    val pendingTasks: Int = 0,
    val focusMinutesToday: Int = 0,
    val agendaToday: Int = 0,
    val flowerBloomed: Boolean = false,
)

@Composable
private fun Modifier.panel(radius: Int = 22): Modifier {
    val colors = OlenaTheme.colors
    return paperPanel(
        fill = colors.surface,
        base = if (colors.isDark) colors.lineStrong else Color(0xFFE3D8C0),
        facetLight = colors.soft,
        facetDark = colors.line,
        border = colors.line,
        shape = RoundedCornerShape(radius.dp),
        radius = radius.dp,
        facet = 34.dp,
        shift = 5.dp,
    )
}

/** Início do app, igual ao Espaço do aluno do site: convite de Matemática, ilha, flor e contadores do dia. */
@Composable
fun HomeScreen(summary: HomeSummary, onExploreMath: () -> Unit) {
    val colors = OlenaTheme.colors
    val dark = colors.isDark
    Column(
        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        // Convite de Matemática com o Oliver espiando por trás.
        Column(Modifier.fillMaxWidth().panel(26)) {
            Column(Modifier.padding(horizontal = 18.dp).padding(top = 22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(stringResource(R.string.home_math_invite), fontSize = 18.sp, lineHeight = 26.sp, color = colors.muted)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    PaperButton(stringResource(R.string.home_explore_math), onExploreMath)
                    Image(painterResource(R.drawable.ic_paper_arrow), null, Modifier.padding(start = 8.dp).size(26.dp))
                }
            }
            Image(
                painterResource(R.drawable.art_oliver_peeking),
                contentDescription = stringResource(R.string.home_oliver_description),
                contentScale = ContentScale.FillWidth,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
            )
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(56.dp).height(12.dp).background(Color(0xFF17BEDC), RoundedCornerShape(6.dp)))
            Box(Modifier.width(30.dp))
            Box(Modifier.width(32.dp).height(12.dp).background(colors.lineStrong, RoundedCornerShape(6.dp)))
        }
        // Ilha de Matemática e a flor de foco.
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(Modifier.weight(1f).aspectRatio(1.15f).panel(), contentAlignment = Alignment.Center) {
                Image(painterResource(R.drawable.art_island_foundations), stringResource(R.string.home_island_description), Modifier.padding(14.dp))
            }
            Box(Modifier.weight(1f).aspectRatio(1.15f).panel(), contentAlignment = Alignment.Center) {
                val rose =
                    when {
                        summary.flowerBloomed -> if (dark) R.drawable.art_rose_bloom_dark else R.drawable.art_rose_bloom
                        else -> if (dark) R.drawable.art_rose_sleeping_dark else R.drawable.art_rose_sleeping
                    }
                Image(painterResource(rose), stringResource(R.string.home_flower_description), Modifier.padding(12.dp))
            }
        }
        // Contadores do dia.
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            StatCard(R.drawable.ic_student_pending, stringResource(R.string.home_stat_pending), summary.pendingTasks, Modifier.weight(1f))
            StatCard(R.drawable.ic_student_focus, stringResource(R.string.home_stat_focus), summary.focusMinutesToday, Modifier.weight(1f))
            StatCard(R.drawable.ic_student_agenda, stringResource(R.string.home_stat_agenda), summary.agendaToday, Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatCard(@DrawableRes icon: Int, label: String, value: Int, modifier: Modifier) {
    Column(modifier.panel(20).padding(horizontal = 14.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Image(painterResource(icon), null, Modifier.size(34.dp))
        Text(label.uppercase(), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, letterSpacing = 0.3.sp, fontSize = 11.sp, maxLines = 1, color = OlenaTheme.colors.muted)
        PaperDigits(value.coerceIn(0, 999).toString(), digitHeight = 40.dp)
    }
}
