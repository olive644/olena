package olenastudy.app.domain.profile

import olenastudy.app.domain.profile.ProfileRules.recognizeSocialLink
import olenastudy.app.domain.profile.ProfileRules.validate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProfileInfoTest {
    @Test
    fun `reconhece as cinco redes e normaliza para https`() {
        assertEquals(SocialLink(SocialNetwork.instagram, "https://instagram.com/oliver"), recognizeSocialLink("www.instagram.com/oliver"))
        assertEquals(SocialLink(SocialNetwork.github, "https://github.com/olive644"), recognizeSocialLink("http://github.com/olive644"))
        assertEquals(SocialLink(SocialNetwork.facebook, "https://facebook.com/oliver"), recognizeSocialLink("https://m.facebook.com/oliver"))
        assertEquals(SocialLink(SocialNetwork.linkedin, "https://linkedin.com/in/oliver"), recognizeSocialLink("https://br.linkedin.com/in/oliver"))
        assertEquals(SocialLink(SocialNetwork.tiktok, "https://tiktok.com/@oliver"), recognizeSocialLink("tiktok.com/@oliver"))
    }

    @Test
    fun `recusa link sem perfil, outro site, porta e senha`() {
        assertNull(recognizeSocialLink("https://instagram.com/"))
        assertNull(recognizeSocialLink("https://exemplo.com/oliver"))
        assertNull(recognizeSocialLink("https://instagram.com:8080/oliver"))
        assertNull(recognizeSocialLink("https://user:pw@instagram.com/oliver"))
        assertNull(recognizeSocialLink("ftp://instagram.com/oliver"))
    }

    @Test
    fun `validacao usa as mesmas mensagens do site`() {
        val ok = ProfileInfo(name = "Oliver", username = "oliver.644")
        assertNull(validate(ok))
        assertEquals("Use um nome de até 60 caracteres.", validate(ok.copy(name = "  ")))
        assertEquals("Nome de usuário: use até 30 letras minúsculas, números, ponto ou _.", validate(ok.copy(username = "Oliver!")))
        assertEquals("A bio pode ter até 240 caracteres.", validate(ok.copy(bio = "a".repeat(241))))
        assertEquals("Use apenas um link por rede social.", validate(ok.copy(socialLinks = listOf("instagram.com/a", "instagram.com/b"))))
        assertEquals("Use links de perfil do Instagram, Facebook, LinkedIn, GitHub ou TikTok.", validate(ok.copy(socialLinks = listOf("exemplo.com/a"))))
    }
}
