package olenastudy.app.domain.profile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileShareTest {
    @Test
    fun linkComOArrobaValido() {
        assertEquals("https://olenastudy.app/perfil?usuario=oliver644", ProfileShare.link("oliver644"))
        assertEquals("https://olenastudy.app/perfil?usuario=a.b_c", ProfileShare.link("a.b_c"))
    }

    @Test
    fun semArrobaOuComArrobaInvalidoApontaSoParaOSite() {
        assertEquals("https://olenastudy.app", ProfileShare.link(""))
        assertEquals("https://olenastudy.app", ProfileShare.link("Nome Com Espaço"))
        assertEquals("https://olenastudy.app", ProfileShare.link("a".repeat(31)))
        assertEquals("http://localhost", ProfileShare.link("", "http://localhost/"))
    }

    @Test
    fun validacaoDoArroba() {
        assertTrue(ProfileShare.isValidHandle("a"))
        assertTrue(ProfileShare.isValidHandle("a".repeat(30)))
        assertFalse(ProfileShare.isValidHandle("A"))
        assertFalse(ProfileShare.isValidHandle("a-b"))
        assertFalse(ProfileShare.isValidHandle("a b"))
    }

    @Test
    fun textoDoCompartilharJuntaFraseELink() {
        assertEquals("Vamos estudar juntos? https://olenastudy.app", ProfileShare.shareText("Vamos estudar juntos?", "https://olenastudy.app"))
    }
}
