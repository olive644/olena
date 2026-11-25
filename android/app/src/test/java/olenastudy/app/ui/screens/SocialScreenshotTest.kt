package olenastudy.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import olenastudy.app.domain.profile.ProfileLook
import olenastudy.app.domain.profile.ProfileShare
import olenastudy.app.ui.MoreMenuContent
import olenastudy.app.ui.OlenaTheme
import org.junit.Rule
import org.junit.Test

/** Imagens dos diálogos sociais e do menu lateral (gradlew recordPaparazziDebug). Diálogos reais não aparecem no Paparazzi, então usa o conteúdo. */
class SocialScreenshotTest {
    @get:Rule
    val paparazzi = Paparazzi(deviceConfig = DeviceConfig.PIXEL_5.copy(softButtons = false, screenHeight = 2400))

    private fun dialog(dark: Boolean, title: String, content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Box(Modifier.fillMaxSize().background(Color(0xFF17151C))) {
                    SocialDialogSurface(title, "Fechar amigos", {}, Modifier.padding(horizontal = 19.dp, vertical = 40.dp), content)
                }
            }
        }
    }

    private fun friends(dark: Boolean) = dialog(dark, "Encontre seus amigos") {
        FriendsContent("", {}, "Entre na conta para adicionar amigos.", {}, {})
    }

    private fun connections(dark: Boolean) = dialog(dark, "Encontre seus amigos") { ConnectionsContent(ConnectionKind.Followers, {}, {}) }

    private fun card(dark: Boolean, username: String) = dialog(dark, "Compartilhar perfil") {
        ShareCardContent("Seu perfil", username, ProfileLook(), ProfileShare.link(username), "Link copiado.", {}, {}, {})
    }

    private fun menu(dark: Boolean) {
        paparazzi.snapshot {
            OlenaTheme(darkTheme = dark) {
                Box(Modifier.fillMaxSize().background(OlenaTheme.colors.page)) { MoreMenuContent({}, {}) }
            }
        }
    }

    @Test fun amigos_claro() = friends(false)
    @Test fun amigos_escuro() = friends(true)
    @Test fun seguidores_claro() = connections(false)
    @Test fun seguidores_escuro() = connections(true)
    @Test fun cartao_claro() = card(false, "oliver644")
    @Test fun cartao_escuro() = card(true, "")
    @Test fun menu_claro() = menu(false)
    @Test fun menu_escuro() = menu(true)
}
