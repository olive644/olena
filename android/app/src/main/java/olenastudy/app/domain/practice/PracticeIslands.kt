package olenastudy.app.domain.practice

/**
 * Ilhas de estudo da aba Praticar, na mesma ordem e com os mesmos textos de
 * src/data/practice-islands.ts. Só Matemática e o início de Inglês estão disponíveis no site;
 * as demais aparecem como "Em preparação".
 */
data class PracticeIsland(
    val number: Int,
    val id: String,
    val subject: String,
    val title: String,
    val description: String,
    val available: Boolean,
)

object PracticeIslands {
    val all: List<PracticeIsland> = listOf(
        PracticeIsland(1, "english", "Inglês", "Cais dos Encontros", "Aprenda inglês com a Olena, uma conversa de cada vez.", true),
        PracticeIsland(2, "portuguese", "Português", "Vale das Histórias", "Bibliotecas, histórias e caminhos para se expressar.", false),
        PracticeIsland(3, "chemistry", "Química", "Ilhas dos Elementos", "Um laboratório de elementos, moléculas e transformações.", false),
        PracticeIsland(4, "biology", "Biologia", "Jardim da Vida", "Um jardim vivo para explorar a natureza.", false),
        PracticeIsland(5, "mathematics", "Matemática", "Picos dos Padrões", "Das primeiras contas à matemática básica do dia a dia.", true),
        PracticeIsland(6, "programming", "Programação", "Oficina do Código", "Uma oficina de código para construir suas ideias.", false),
        PracticeIsland(7, "spanish", "Espanhol", "Praça dos Ventos", "Em preparação", false),
        PracticeIsland(8, "japanese", "Japonês", "Jardim das Palavras", "Em preparação", false),
        PracticeIsland(9, "chinese", "Chinês", "Pátio dos Traços", "Em preparação", false),
    )

    /** A ilha em que o site abre: Matemática, a quinta. */
    val startIndex: Int = all.indexOfFirst { it.id == "mathematics" }
}
