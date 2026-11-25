package olenastudy.app.ui.navigation

import java.net.URI
import java.net.URISyntaxException
import java.util.Locale

sealed interface AppLinkTarget {
    data class Native(val destination: AppDestination) : AppLinkTarget
    data class Website(val url: String) : AppLinkTarget
    data object Rejected : AppLinkTarget
}

data class AppLinkRequest(val id: Long, val destination: AppDestination)

/** Links são entrada não confiável; parâmetros de fluxos ainda não migrados ficam no site. */
object AppLinks {
    private val hosts = setOf("www.olenastudy.com.br", "olenastudy.com.br")
    private val paths = mapOf(
        "/" to AppDestination.Today,
        "/planejador" to AppDestination.Planner,
        "/aprender" to AppDestination.Learn,
        "/foco" to AppDestination.Focus,
        "/perfil" to AppDestination.Profile,
        "/habitos" to AppDestination.Profile,
    )

    fun resolve(url: String?): AppLinkTarget {
        if (url == null) return AppLinkTarget.Rejected
        val uri = try {
            URI(url)
        } catch (_: URISyntaxException) {
            return AppLinkTarget.Rejected
        }
        if (
            uri.isOpaque || !uri.scheme.equals("https", ignoreCase = true) ||
            uri.host?.lowercase(Locale.ROOT) !in hosts || uri.rawUserInfo != null ||
            uri.port !in listOf(-1, 443)
        ) return AppLinkTarget.Rejected

        val path = uri.rawPath.orEmpty().trimEnd('/').ifEmpty { "/" }.lowercase(Locale.ROOT)
        val destination = paths[path]
        return if (destination != null && uri.rawQuery == null && uri.rawFragment == null) {
            AppLinkTarget.Native(destination)
        } else {
            AppLinkTarget.Website(uri.toASCIIString())
        }
    }
}
