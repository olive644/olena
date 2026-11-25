package olenastudy.app.data.achievements

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json

/** Cartão da galeria de Conquistas do site: uma família de conquistas com o próximo nível a alcançar. */
@Serializable
data class AchievementTile(
    val id: String,
    val name: String,
    /** "common", "uncommon" ou "rare", que define a cor do rótulo. */
    val rarity: String,
    val rarityLabel: String,
    /** "atual/meta", por exemplo "0/25". */
    val progress: String,
    val extra: String = "",
    /** "math", "english" ou "general", a aba da galeria. */
    val tab: String,
    val index: Int = 0,
) {
    val current: String get() = progress.substringBefore('/')
    val target: String get() = progress.substringAfter('/', "")
}

object AchievementCatalog {
    private val json = Json { ignoreUnknownKeys = true }
    private val serializer = ListSerializer(AchievementTile.serializer())

    /** JSON exportado do próprio site (galeria de Conquistas, estado bloqueado). Texto inválido vira lista vazia. */
    fun parse(text: String): List<AchievementTile> =
        try {
            json.decodeFromString(serializer, text)
        } catch (_: Exception) {
            emptyList()
        }

    fun load(context: Context): List<AchievementTile> =
        parse(context.assets.open("achievements.json").bufferedReader().use { it.readText() })

    fun byTab(all: List<AchievementTile>, tab: String): List<AchievementTile> = all.filter { it.tab == tab }.sortedBy { it.index }
}
