package olenastudy.app.ui.navigation

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import olenastudy.app.R

/**
 * Destinos da navegação principal, na mesma ordem da barra móvel do site (src/components/
 * app-navigation.tsx): Espaço, Agenda, Praticar, Foco, Biblioteca e Perfil.
 *
 * Cada ícone de papel existe em três variantes, como no site: `claro` (tema claro), `escuro`
 * (tema escuro) e `roxo` (destino ativo). O Perfil tem ícone próprio para repouso e ativo.
 */
enum class AppDestination(
    val route: String,
    @StringRes val label: Int,
    @DrawableRes private val light: Int,
    @DrawableRes private val dark: Int,
    @DrawableRes private val active: Int,
) {
    Today("today", R.string.nav_today, R.drawable.ic_nav_today_claro, R.drawable.ic_nav_today_escuro, R.drawable.ic_nav_today_roxo),
    Planner("planner", R.string.nav_planner, R.drawable.ic_nav_planner_claro, R.drawable.ic_nav_planner_escuro, R.drawable.ic_nav_planner_roxo),
    Learn("learn", R.string.nav_learn, R.drawable.ic_nav_gamepad_claro, R.drawable.ic_nav_gamepad_escuro, R.drawable.ic_nav_gamepad_roxo),
    Focus("focus", R.string.nav_focus, R.drawable.ic_nav_focus_claro, R.drawable.ic_nav_focus_escuro, R.drawable.ic_nav_focus_roxo),
    Library("library", R.string.nav_library, R.drawable.ic_nav_library_claro, R.drawable.ic_nav_library_escuro, R.drawable.ic_nav_library_roxo),
    // No tema escuro o ícone de repouso do Perfil é o mais claro (profile-active.svg), como o site faz com `profileAdaptive`.
    Profile("profile", R.string.nav_profile, R.drawable.ic_nav_profile, R.drawable.ic_nav_profile_active, R.drawable.ic_nav_profile_active),
    ;

    @DrawableRes
    fun icon(selected: Boolean, darkTheme: Boolean): Int =
        when {
            selected -> active
            darkTheme -> dark
            else -> light
        }

    companion object {
        val start = Today

        fun fromRoute(route: String?): AppDestination = entries.firstOrNull { it.route == route } ?: start
    }
}
