package olenastudy.app.domain.profile

import java.net.URI

/** Dados de texto do perfil, como `ProfileDraft` do site (nome, @, bio, pronomes e até 5 redes). */
data class ProfileInfo(
    val name: String = "",
    val username: String = "",
    val bio: String = "",
    val pronouns: String = "",
    val socialLinks: List<String> = emptyList(),
)

enum class SocialNetwork(val label: String) {
    instagram("Instagram"),
    facebook("Facebook"),
    linkedin("LinkedIn"),
    github("GitHub"),
    tiktok("TikTok"),
}

data class SocialLink(val network: SocialNetwork, val url: String)

object ProfileRules {
    const val NAME_MAX = 60
    const val USERNAME_MAX = 30
    const val BIO_MAX = 240
    const val PRONOUNS_MAX = 40
    const val LINKS_MAX = 5
    val PRONOUN_PRESETS = listOf("Ela/dela", "Ele/dele", "Elu/delu")

    private val schemePattern = Regex("^[a-z][a-z0-9+.-]*:", RegexOption.IGNORE_CASE)
    private val linkedinHost = Regex("^[a-z]{2}\\.linkedin\\.com$")
    private val usernamePattern = Regex("^[a-z0-9._]{1,30}$")

    /** Mesma regra de `recognizeSocialLink` do site: só Instagram, Facebook, LinkedIn, GitHub e TikTok, sempre em https. */
    fun recognizeSocialLink(input: String): SocialLink? {
        if (input.length > 500) return null
        val text = input.trim()
        val uri =
            try {
                URI(if (schemePattern.containsMatchIn(text)) text else "https://$text")
            } catch (_: Exception) {
                return null
            }
        val host = uri.host?.lowercase()?.removePrefix("www.") ?: return null
        if (uri.scheme != "https" && uri.scheme != "http") return null
        if (uri.userInfo != null || uri.port != -1) return null
        val network =
            SocialNetwork.entries.firstOrNull { name ->
                host == "${name.name}.com" ||
                    (name == SocialNetwork.facebook && host == "m.facebook.com") ||
                    (name == SocialNetwork.linkedin && linkedinHost.matches(host))
            } ?: return null
        if ((uri.rawPath ?: "").replace("/", "").trim().isEmpty()) return null
        val path = uri.rawPath ?: ""
        val query = uri.rawQuery?.let { "?$it" } ?: ""
        val fragment = uri.rawFragment?.let { "#$it" } ?: ""
        return SocialLink(network, "https://${network.name}.com$path$query$fragment")
    }

    /** Devolve a mensagem de erro do site, ou `null` se o rascunho está válido. */
    fun validate(draft: ProfileInfo): String? {
        if (draft.name.trim().isEmpty() || draft.name.trim().length > NAME_MAX) return "Use um nome de até 60 caracteres."
        if (draft.username.isNotEmpty() && !usernamePattern.matches(draft.username)) {
            return "Nome de usuário: use até 30 letras minúsculas, números, ponto ou _."
        }
        if (draft.bio.length > BIO_MAX) return "A bio pode ter até 240 caracteres."
        if (draft.pronouns.length > PRONOUNS_MAX) return "Os pronomes podem ter até 40 caracteres."
        val links = draft.socialLinks.filter { it.isNotBlank() }
        if (links.size > LINKS_MAX) return "Adicione no máximo cinco redes sociais."
        val recognized = links.map(::recognizeSocialLink)
        if (recognized.any { it == null }) return "Use links de perfil do Instagram, Facebook, LinkedIn, GitHub ou TikTok."
        if (recognized.mapNotNull { it?.network }.toSet().size != links.size) return "Use apenas um link por rede social."
        return null
    }
}
