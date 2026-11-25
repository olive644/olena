package olenastudy.app.domain.profile

/** Regras do link de compartilhar perfil, as mesmas do site (profile-share-card.tsx). */
object ProfileShare {
    /** Endereço do OlenaStudy usado nos links (o PWA do site). */
    const val BASE_URL = "https://olenastudy.app"

    private val HANDLE = Regex("^[a-z0-9._]{1,30}$")

    /** `@` válido: minúsculas, números, ponto e sublinhado, de 1 a 30 caracteres. */
    fun isValidHandle(username: String): Boolean = HANDLE.matches(username)

    /**
     * Link do perfil: `/perfil?usuario=@` com o `@` válido. Sem `@` (ainda não há conta) o link
     * aponta só para o OlenaStudy, para nunca inventar um perfil que não existe.
     */
    fun link(username: String, baseUrl: String = BASE_URL): String {
        val origin = baseUrl.trimEnd('/')
        return if (isValidHandle(username)) "$origin/perfil?usuario=$username" else origin
    }

    /** Texto enviado pelo Compartilhar: a frase do cartão e o link, como o site manda título, texto e link. */
    fun shareText(tagline: String, link: String): String = "$tagline $link"
}
