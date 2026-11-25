package olenastudy.app.ui.screens

import androidx.annotation.StringRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import olenastudy.app.ui.components.paperPanel
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import olenastudy.app.R
import olenastudy.app.data.settings.ThemeMode
import olenastudy.app.ui.ManropeFamily
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.PaperButton
import olenastudy.app.ui.components.PaperButtonStyle
import olenastudy.app.ui.components.PaperCard
import olenastudy.app.ui.navigation.AppDestination

/** Base de toda tela simples: rolagem, margem e título em Manrope. */
@Composable
fun ScreenScaffold(
    @StringRes title: Int,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = stringResource(title),
            style = MaterialTheme.typography.headlineLarge,
            color = OlenaTheme.colors.text,
        )
        content()
    }
}

/** Tela que ainda não existe no app nativo. Diz isso claramente, sem dados de mentira. */
@Composable
fun InProgressScreen(@StringRes title: Int) {
    ScreenScaffold(title) {
        PaperCard(Modifier.fillMaxWidth()) {
            Text(
                text = stringResource(R.string.screen_in_progress),
                style = MaterialTheme.typography.bodyLarge,
                color = OlenaTheme.colors.muted,
            )
        }
    }
}

/** Título de cada destino que ainda não tem tela própria. */
fun AppDestination.titleRes(): Int =
    when (this) {
        AppDestination.Today -> R.string.screen_today_title
        AppDestination.Planner -> R.string.screen_planner_title
        AppDestination.Learn -> R.string.screen_learn_title
        AppDestination.Focus -> R.string.screen_focus_title
        AppDestination.Library -> R.string.screen_library_title
        AppDestination.Profile -> R.string.screen_profile_title
    }
