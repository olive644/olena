package olenastudy.app.domain.practice

import java.security.MessageDigest
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MathMasteryParityTest {
    private val json = Json { encodeDefaults = true }
    private fun resource(name: String): String = requireNotNull(javaClass.classLoader?.getResourceAsStream("practice/$name")).bufferedReader().use { it.readText() }
    private val bank = MathQuestionBank(json.decodeFromString<MathBankFile>(resource("math-bank.json")))

    private fun canonical(value: JsonElement): JsonElement = when (value) {
        is JsonObject -> JsonObject(value.toSortedMap().mapValues { canonical(it.value) })
        is JsonArray -> JsonArray(value.map(::canonical))
        else -> value
    }
    private fun hash(p: MathMasteryProgress): String = MessageDigest.getInstance("SHA-256")
        .digest(canonical(json.parseToJsonElement(json.encodeToString(p))).toString().toByteArray(Charsets.UTF_8))
        .joinToString("") { "%02x".format(it.toInt() and 255) }

    @Test fun nativeEngineMatchesEveryStepExportedFromTheWeb() {
        val traces = json.parseToJsonElement(resource("math-parity.json")).jsonObject.getValue("traces").jsonArray
        var total = 0
        for (trace in traces) {
            val fields = trace.jsonObject
            val course = fields.getValue("course").jsonPrimitive.content
            val mode = fields.getValue("mode").jsonPrimitive.content
            var progress = MathMasteryProgress()
            var streak = 0
            for ((index, step) in fields.getValue("steps").jsonArray.withIndex()) {
                val expected = step.jsonObject
                val label = "$course/$mode/$index"
                val question = MathMastery.next(course, progress, bank)
                assertEquals("$label seed", expected.getValue("seed").jsonPrimitive.int, question.entry.seed)
                assertEquals("$label phase", expected.getValue("phase").jsonPrimitive.content, question.phase)
                assertEquals("$label position", expected.getValue("position").jsonPrimitive.contentOrNull?.toInt(), question.position)
                assertEquals("$label choices", expected.getValue("choices").jsonArray.map { it.jsonPrimitive.double }, question.choices)
                val result = MathMastery.assess(course, progress, question, expected.getValue("choice").jsonPrimitive.double,
                    expected.getValue("elapsed").jsonPrimitive.double, streak, bank, expected.getValue("timedOut").jsonPrimitive.content.toBoolean())
                progress = result.progress; streak = result.streak
                assertEquals("$label correctness", expected.getValue("correct").jsonPrimitive.content.toBoolean(), result.correct)
                assertEquals("$label points", expected.getValue("points").jsonPrimitive.int, result.points)
                assertEquals("$label streak", expected.getValue("streak").jsonPrimitive.int, streak)
                assertEquals("$label fast", expected.getValue("fast").jsonPrimitive.content.toBoolean(), result.fast)
                assertEquals("$label final", expected.getValue("finalOutcome").jsonPrimitive.contentOrNull, result.finalOutcome)
                assertEquals("$label percent", expected.getValue("percent").jsonPrimitive.int, MathMastery.completion(progress).percent)
                assertEquals("$label state", expected.getValue("hash").jsonPrimitive.content, hash(progress))
                total++
            }
            if (mode == "correct") assertEquals(63, progress.confirmed)
        }
        assertEquals(2293, total)
    }

    @Test fun catalogPreservesThePublishedCourseAndEnglishPartOrder() {
        val catalog = json.decodeFromString<PracticeCatalog>(resource("catalog.json"))
        assertEquals(listOf("foundations", "school", "advanced", "calculus1", "calculus2", "calculus3"), catalog.courses.map { it.id })
        assertTrue(catalog.courses.all { it.topics.size == 6 })
        assertEquals(listOf(0, 1, 2, 3, 6, 4, 7, 5), catalog.english.map { it.index })
        assertEquals("Mercado dos Encontros", catalog.english[4].title)
        assertEquals("Arquivo das Entrelinhas", catalog.english[6].title)
    }
}
