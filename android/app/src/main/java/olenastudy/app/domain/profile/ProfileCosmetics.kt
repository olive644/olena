package olenastudy.app.domain.profile

/** Item de personalização do perfil. `id` é o que fica guardado; `name` é o nome mostrado. */
data class Cosmetic(val id: String, val name: String)

/** Escolhas de aparência do perfil: avatar, moldura, capa (header) e fundo. */
data class ProfileLook(
    val avatarId: String = ProfileAvatars.DEFAULT_ID,
    val frameId: String = "none",
    val coverId: String = "helena",
    val backgroundId: String = "paper",
)

/** Mesmas listas, ordem, nomes e regras de src/domain/profile-cosmetics.ts e profile-covers.ts. */
object ProfileCosmetics {
    private val pride =
        listOf(
            Cosmetic("pride", "Orgulho LGBT"),
            Cosmetic("lesbian", "Lésbica"),
            Cosmetic("gay", "Gay"),
            Cosmetic("bi", "Bissexual"),
            Cosmetic("trans", "Trans"),
            Cosmetic("pan", "Pansexual"),
            Cosmetic("nonbinary", "Não binárie"),
            Cosmetic("ace", "Assexual"),
            Cosmetic("aro", "Arromântica"),
            Cosmetic("agender", "Agênero"),
            Cosmetic("genderfluid", "Gênero fluido"),
            Cosmetic("intersex", "Intersexo"),
        )

    val frames: List<Cosmetic> =
        listOf(Cosmetic("none", "Sem moldura")) + pride +
            listOf(Cosmetic("mathematics", "Guardião dos números"), Cosmetic("english", "Guardião das palavras"))

    val covers: List<Cosmetic> =
        listOf(
            Cosmetic("helena", "Noite da Olena"),
            Cosmetic("solar", "Eclipse Solar"),
            Cosmetic("aurora", "Aurora"),
            Cosmetic("forest", "Bosque"),
            Cosmetic("ocean", "Oceano"),
        ) + pride + listOf(Cosmetic("mathematics", "Horizonte dos números"), Cosmetic("english", "Horizonte das palavras"))

    val backgrounds: List<Cosmetic> =
        listOf(Cosmetic("paper", "Papel original")) + pride +
            listOf(
                Cosmetic("mathematics", "Guardião dos números"),
                Cosmetic("english", "Guardião das palavras"),
                Cosmetic("night", "Céu de papel"),
                Cosmetic("geometry", "Caderno geométrico"),
            )

    fun frame(id: String?): String = frames.firstOrNull { it.id == id }?.id ?: "none"

    fun cover(id: String?): String = covers.firstOrNull { it.id == id }?.id ?: "helena"

    fun background(id: String?): String = backgrounds.firstOrNull { it.id == id }?.id ?: "paper"

    enum class Kind { Frame, Cover, Background }

    /** Matemática e Inglês só abrem com conquistas (`earned` guarda os ids delas), como `cosmeticUnlocked` do site. */
    fun unlocked(kind: Kind, id: String, earned: Set<String>): Boolean =
        when (id) {
            "english" -> earned.contains(if (kind == Kind.Frame) "english-parts-8" else "english-correct-100")
            "mathematics" -> earned.contains(if (kind == Kind.Frame) "islands-1" else "correct-100")
            else -> true
        }

    fun lockedHint(kind: Kind, id: String): String =
        if (id == "english") {
            if (kind == Kind.Frame) "Complete a ilha de Inglês." else "Acerte 100 atividades de Inglês."
        } else if (kind == Kind.Frame) {
            "Complete uma ilha de Matemática."
        } else {
            "Acerte 100 contas em Matemática."
        }
}
