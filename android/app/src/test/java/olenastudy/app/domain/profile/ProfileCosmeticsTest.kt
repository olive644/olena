package olenastudy.app.domain.profile

import olenastudy.app.domain.profile.ProfileCosmetics.Kind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfileCosmeticsTest {
    @Test
    fun `listas na ordem e nos tamanhos do site`() {
        assertEquals(15, ProfileCosmetics.frames.size)
        assertEquals(19, ProfileCosmetics.covers.size)
        assertEquals(17, ProfileCosmetics.backgrounds.size)
        assertEquals("none", ProfileCosmetics.frames.first().id)
        assertEquals("Noite da Olena", ProfileCosmetics.covers.first().name)
        assertEquals("geometry", ProfileCosmetics.backgrounds.last().id)
    }

    @Test
    fun `id desconhecido volta ao padrao`() {
        assertEquals("none", ProfileCosmetics.frame("x"))
        assertEquals("helena", ProfileCosmetics.cover(null))
        assertEquals("paper", ProfileCosmetics.background("x"))
        assertEquals("pan", ProfileCosmetics.frame("pan"))
    }

    @Test
    fun `matematica e ingles dependem de conquistas, o resto esta aberto`() {
        assertTrue(ProfileCosmetics.unlocked(Kind.Frame, "pride", emptySet()))
        assertFalse(ProfileCosmetics.unlocked(Kind.Frame, "mathematics", emptySet()))
        assertTrue(ProfileCosmetics.unlocked(Kind.Frame, "mathematics", setOf("islands-1")))
        assertFalse(ProfileCosmetics.unlocked(Kind.Cover, "mathematics", setOf("islands-1")))
        assertTrue(ProfileCosmetics.unlocked(Kind.Cover, "mathematics", setOf("correct-100")))
        assertFalse(ProfileCosmetics.unlocked(Kind.Background, "english", emptySet()))
        assertTrue(ProfileCosmetics.unlocked(Kind.Background, "english", setOf("english-correct-100")))
    }
}
