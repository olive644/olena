package olenastudy.app.ui.navigation

import org.junit.Assert.assertEquals
import org.junit.Test

class AppLinksTest {
    @Test
    fun `as telas disponíveis seguem os caminhos do site nos dois domínios`() {
        val paths = mapOf(
            "/" to AppDestination.Today,
            "/planejador" to AppDestination.Planner,
            "/aprender" to AppDestination.Learn,
            "/foco" to AppDestination.Focus,
            "/perfil" to AppDestination.Profile,
            "/habitos" to AppDestination.Profile,
        )
        for (host in listOf("www.olenastudy.com.br", "olenastudy.com.br")) {
            for ((path, destination) in paths) {
                assertEquals(AppLinkTarget.Native(destination), AppLinks.resolve("https://$host$path"))
            }
        }
    }

    @Test
    fun `normaliza caminho e barra final como o site`() {
        assertEquals(AppLinkTarget.Native(AppDestination.Focus), AppLinks.resolve("HTTPS://WWW.OLENASTUDY.COM.BR/FOCO/"))
        assertEquals(AppLinkTarget.Native(AppDestination.Today), AppLinks.resolve("https://olenastudy.com.br"))
        assertEquals(AppLinkTarget.Native(AppDestination.Planner), AppLinks.resolve("https://olenastudy.com.br:443/planejador"))
    }

    @Test
    fun `perfil público e parâmetros não viram perfil próprio ou tela sem contexto`() {
        for (suffix in listOf("/perfil?usuario=teste", "/foco?modo=pomodoro", "/?login=1", "/?", "/aprender#parte-2")) {
            val url = "https://www.olenastudy.com.br$suffix"
            assertEquals(AppLinkTarget.Website(url), AppLinks.resolve(url))
        }
    }

    @Test
    fun `módulos não migrados e documentos continuam no site`() {
        for (path in listOf("/biblioteca", "/cadernos", "/aulas", "/atividades", "/notificacoes", "/politica-de-privacidade.html", "/inexistente", "/perfil/configuracoes")) {
            val url = "https://olenastudy.com.br$path"
            assertEquals(AppLinkTarget.Website(url), AppLinks.resolve(url))
        }
    }

    @Test
    fun `rejeita esquemas domínios credenciais e portas fora do contrato`() {
        for (url in listOf(
            "http://www.olenastudy.com.br/foco", "javascript:alert(1)", "file:///foco", "/foco",
            "https://outro.example/foco", "https://olenastudy.com.br.outro.example/foco",
            "https://olenastudy.com.br@outro.example/foco", "https://pessoa@olenastudy.com.br/foco",
            "https://olenastudy.com.br:8443/foco", "https://olenastudy.vercel.app/foco", "https://olenastudy.app/foco",
        )) assertEquals(url, AppLinkTarget.Rejected, AppLinks.resolve(url))
    }

    @Test
    fun `URL ausente malformada ou com controles não derruba o app`() {
        for (url in listOf(null, "", "https://[", "https://olenastudy.com.br/%", "https://olenastudy.com.br/\nfoco")) {
            assertEquals(AppLinkTarget.Rejected, AppLinks.resolve(url))
        }
    }

    @Test
    fun `não interpreta caminho codificado como rota nativa`() {
        val url = "https://olenastudy.com.br/%66oco"
        assertEquals(AppLinkTarget.Website(url), AppLinks.resolve(url))
    }

    @Test
    fun `parâmetros preservados não viram instruções de autenticação no app`() {
        val url = "https://olenastudy.com.br/?login=1&retorno=%2Fperfil%3Fusuario%3Dteste"
        assertEquals(AppLinkTarget.Website(url), AppLinks.resolve(url))
    }
}
