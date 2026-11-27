package olenastudy.app.domain.practice

import kotlinx.serialization.Serializable

@Serializable
data class PracticeCourse(
    val id: String, val title: String, val subject: String, val initialQuestionSeconds: Int,
    val color: String, val shade: String, val light: String, val topics: List<String>,
)

@Serializable
data class EnglishPlace(val index: Int, val id: String, val art: String, val title: String, val subject: String)

@Serializable
data class PracticeCatalog(val version: Int, val courses: List<PracticeCourse>, val english: List<EnglishPlace>)

@Serializable
data class MathBankEntry(
    val course: String, val id: String, val revision: Int, val format: Int,
    val expression: String, val answer: Double, val choices: List<Double>, val seed: Int,
    val topic: String, val budget: Int, val drain: Int, val source: String,
    val difficulty: Int, val review: String,
)

@Serializable
data class MathBankFile(val revision: Int, val questions: List<MathBankEntry>)

@Serializable
data class MasteryQuestion(val entry: MathBankEntry, val choices: List<Double>, val phase: String = "practice", val position: Int? = null)

/** Banco autoral exportado da web. Não gera perguntas diferentes do currículo publicado. */
class MathQuestionBank(file: MathBankFile) {
    private val questions = file.questions.associateBy { it.course to it.seed }

    init {
        require(file.revision == 3 && questions.size == 2592 && questions.size == file.questions.size)
        require(file.questions.all {
            it.revision == 3 && it.seed in 1..432 && it.choices.size == 4 &&
                it.choices.distinct().size == 4 && it.choices.first() == it.answer &&
                it.choices.all(Double::isFinite) && it.budget > 0 && it.drain == 1
        })
        require(questions.keys.map { it.first }.toSet() == setOf("foundations", "school", "advanced", "calculus1", "calculus2", "calculus3"))
        require(questions.keys.groupBy { it.first }.values.all { keys -> keys.map { it.second }.toSet() == (1..432).toSet() })
    }

    fun question(course: String, seed: Int, shuffle: Int): MasteryQuestion {
        val entry = requireNotNull(questions[course to seed])
        val level = if (seed > 288) (seed - 289) / 24 else (seed - 1) / 48
        val index = if (seed > 288) 48 + (seed - 289) % 24 else (seed - 1) % 48
        var state = ((shuffle.toLong() + index * 97L + level * 389L) % 2147483646L) + 1
        val choices = entry.choices.toMutableList()
        for (i in 3 downTo 1) {
            state = state * 16807L % 2147483647L
            val j = (state % (i + 1)).toInt()
            val old = choices[i]; choices[i] = choices[j]; choices[j] = old
        }
        return MasteryQuestion(entry, choices)
    }
}
