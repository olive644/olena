package olenastudy.app.ui.navigation

import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.hasProgressBarRangeInfo
import androidx.compose.ui.semantics.ProgressBarRangeInfo

/** A leitura inicial do DataStore pode continuar depois do primeiro frame da Activity. */
fun ComposeTestRule.awaitAppReady() {
    waitUntil(timeoutMillis = 10_000) {
        onAllNodesWithContentDescription("Navegação principal").fetchSemanticsNodes().isNotEmpty() &&
            onAllNodes(hasProgressBarRangeInfo(ProgressBarRangeInfo.Indeterminate)).fetchSemanticsNodes().isEmpty()
    }
}
