package olenastudy.app.domain.profile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileAvatarsTest {
    @Test
    fun `sao 16 avatares, ids unicos, na ordem do site`() {
        assertEquals(16, ProfileAvatars.all.size)
        assertEquals(16, ProfileAvatars.all.map { it.id }.toSet().size)
        assertEquals(listOf("Poliana", "Oliver", "Andreyna", "Ninho", "Olena"), ProfileAvatars.all.take(5).map { it.name })
        assertEquals("Teco", ProfileAvatars.all.last().name)
    }

    @Test
    fun `id desconhecido ou ausente volta para Olena`() {
        assertEquals("helena", ProfileAvatars.resolve(null).id)
        assertEquals("helena", ProfileAvatars.resolve("nao-existe").id)
        assertEquals("Leo", ProfileAvatars.resolve("leo").name)
        assertTrue(ProfileAvatars.all.any { it.id == ProfileAvatars.DEFAULT_ID })
    }
}
