package olenastudy.app.domain.profile

/** Avatar do perfil. `id` é o que fica guardado; `name` é o nome mostrado, como em `PROFILE_AVATARS` do site. */
data class ProfileAvatar(val id: String, val name: String)

object ProfileAvatars {
    const val DEFAULT_ID = "helena"

    /** Mesma ordem e mesmos nomes de src/domain/profile-avatars.ts. */
    val all: List<ProfileAvatar> =
        listOf(
            ProfileAvatar("poliana", "Poliana"),
            ProfileAvatar("oliver", "Oliver"),
            ProfileAvatar("andreyna", "Andreyna"),
            ProfileAvatar("jairo", "Ninho"),
            ProfileAvatar("helena", "Olena"),
            ProfileAvatar("alice", "Alice"),
            ProfileAvatar("soso", "Soso Estrelinha"),
            ProfileAvatar("nicolas", "Nicolas"),
            ProfileAvatar("guilherme", "Guilherme"),
            ProfileAvatar("erick", "Erick"),
            ProfileAvatar("miau", "Miau"),
            ProfileAvatar("luizao", "Luizão"),
            ProfileAvatar("anonha", "Anonha"),
            ProfileAvatar("moguel", "Moguel"),
            ProfileAvatar("leo", "Leo"),
            ProfileAvatar("teco", "Teco"),
        )

    /** Valor guardado desconhecido ou ausente volta ao avatar padrão, como `profileAvatarSource` no site. */
    fun resolve(id: String?): ProfileAvatar = all.firstOrNull { it.id == id } ?: all.first { it.id == DEFAULT_ID }
}
