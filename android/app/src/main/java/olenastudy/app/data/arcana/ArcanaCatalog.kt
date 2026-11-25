package olenastudy.app.data.arcana

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

/** Carta da galeria de Arcano do site, no estado "Ainda não obtida". */
@Serializable
data class ArcanaCard(
    val id: String,
    val name: String,
    /** 0 = Comum, 2 = Épica, 3 = Lendária (o número usado pelo site). */
    val rarity: Int,
    val rarityLabel: String,
    /** "major", "wands", "cups", "swords" ou "pentacles". */
    val group: String,
    val mark: String = "",
    /** Altura do nome no site em px de CSS (15 por linha); define quantas linhas o nome ocupa. */
    val nameH: Float = 15f,
) {
    val nameLines: Int get() = if (nameH > 22f) 2 else 1
}

/** Categorias da galeria (as sete abas com ícone). */
enum class ArcanaCategory(val key: String) {
    All("all"),
    Major("major"),
    Minor("minor"),
    Wands("wands"),
    Cups("cups"),
    Swords("swords"),
    Pentacles("pentacles"),
}

object ArcanaCatalog {
    private val json = Json { ignoreUnknownKeys = true }
    private val serializer = ListSerializer(ArcanaCard.serializer())

    /** JSON exportado do próprio site (galeria de Arcano). Texto inválido vira lista vazia. */
    fun parse(text: String): List<ArcanaCard> =
        try {
            json.decodeFromString(serializer, text)
        } catch (_: Exception) {
            emptyList()
        }

    fun load(context: Context): List<ArcanaCard> =
        parse(context.assets.open("arcana.json").bufferedReader().use { it.readText() })

    /** Mesmo filtro do site: "Arcano menor" reúne os quatro naipes, as demais abas filtram pelo grupo. */
    fun filter(all: List<ArcanaCard>, category: ArcanaCategory): List<ArcanaCard> =
        when (category) {
            ArcanaCategory.All -> all
            ArcanaCategory.Minor -> all.filter { it.group != "major" }
            else -> all.filter { it.group == category.key }
        }

    /** Caminho da arte no estado bloqueado: o site troca o quadro da carta conforme o tema. */
    fun artPath(id: String, dark: Boolean): String = if (dark) "arcana-dark/$id.webp" else "arcana/$id.webp"
}
