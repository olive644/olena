package olenastudy.app.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.key.*
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.io.IOException
import java.math.BigDecimal
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import olenastudy.app.R
import olenastudy.app.domain.practice.*
import olenastudy.app.ui.OlenaTheme
import olenastudy.app.ui.components.*
import android.os.SystemClock
import kotlin.math.ceil

data class MathPracticeContent(val catalog: PracticeCatalog, val bank: MathQuestionBank)

private val RoundSaver = Saver<MathArcadeRound, String>(
    save = { Json.encodeToString(it) },
    restore = { Json.decodeFromString<MathArcadeRound>(it).recover() },
)

@Composable
fun MathPracticeScreen(avatarId: String, onBack: () -> Unit, onOpenAccount: () -> Unit) {
    val context = LocalContext.current.applicationContext
    val source = remember(context) {
        flow {
            try {
                val catalog = context.assets.open("practice/catalog.json").bufferedReader().use { Json.decodeFromString<PracticeCatalog>(it.readText()) }
                val bank = context.assets.open("practice/math-bank.json").bufferedReader().use { MathQuestionBank(Json.decodeFromString<MathBankFile>(it.readText())) }
                require(catalog.version == 1 && catalog.courses.map { it.id } == listOf("foundations", "school", "advanced", "calculus1", "calculus2", "calculus3"))
                require(catalog.courses.all { it.topics.size == 6 })
                emit(MathPracticeContent(catalog, bank))
            } catch (failure: SerializationException) {
                throw IOException("Conteúdo de prática inválido", failure)
            } catch (failure: IllegalArgumentException) {
                throw IOException("Banco de prática inválido", failure)
            }
        }.flowOn(Dispatchers.IO)
    }
    val read = rememberReadState(source)
    BackHandler { onBack() }
    ReadStateContent(read.state, read.retry, "Preparando a prática") { content ->
        MathPracticeJourney(content, avatarId, onBack, onOpenAccount)
    }
}

@Composable
fun MathPracticeJourney(content: MathPracticeContent, avatarId: String = "helena", onBack: () -> Unit = {}, onOpenAccount: () -> Unit = {}) {
    var route by rememberSaveable { mutableStateOf("map") }
    var courseIndex by rememberSaveable { mutableIntStateOf(0) }
    var round by rememberSaveable(stateSaver = RoundSaver) { mutableStateOf(MathArcadeRound()) }
    var leaving by rememberSaveable { mutableStateOf(false) }
    val course = content.catalog.courses[courseIndex]
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    fun back() {
        when (route) {
            "game" -> { round = round.pause(SystemClock.elapsedRealtime(), System.currentTimeMillis(), content.bank); leaving = true }
            "entry" -> route = "map"
            else -> onBack()
        }
    }
    BackHandler { back() }
    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP && route == "game") round = round.pause(SystemClock.elapsedRealtime(), System.currentTimeMillis(), content.bank)
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(route, round.stage, round.paused, leaving) {
        if (route == "game" && round.stage in setOf("playing", "countdown", "feedback") && !round.paused && !leaving) {
            while (true) {
                delay(100)
                round = round.tick(SystemClock.elapsedRealtime(), System.currentTimeMillis(), content.bank)
            }
        }
    }
    when (route) {
        "map" -> MathCourseMap(content.catalog.courses, courseIndex, avatarId,
            onSelect = { courseIndex = it }, onBack = onBack,
            onExplore = { route = "entry" }, onOpenAccount = onOpenAccount)
        "entry" -> PracticeColumn {
            PaperButton("Voltar aos percursos", { route = "map" }, style = PaperButtonStyle.Quiet)
            CourseArt(course.id, Modifier.fillMaxWidth().height(230.dp))
            PracticeTitle(course.title)
            PracticeBody(course.topics.joinToString(" · "))
            PracticeBody("Três vidas. Responda antes do tempo acabar e revise os erros ao final.")
            GuestNotice()
            PaperButton("Praticar", {
                round = round.retry().start(SystemClock.elapsedRealtime(), System.currentTimeMillis())
                route = "game"
            }, leading = { Image(painterResource(R.drawable.ic_practice_play), null, Modifier.size(26.dp)) })
        }
        else -> MathRoundContent(round, content.bank, onAnswer = { choice ->
            round = round.answer(choice, SystemClock.elapsedRealtime(), System.currentTimeMillis(), content.bank)
        }, onPause = {
            round = round.pause(SystemClock.elapsedRealtime(), System.currentTimeMillis(), content.bank)
        }, onResume = { round = round.resume(SystemClock.elapsedRealtime(), System.currentTimeMillis()) },
            onContinue = { round = round.continueMilestone(SystemClock.elapsedRealtime(), System.currentTimeMillis()) },
            onReview = { round = round.reviewNext() }, onRetry = {
                round = round.retry().start(SystemClock.elapsedRealtime(), System.currentTimeMillis())
            }, onBack = { back() })
    }
    if (leaving) Dialog(onDismissRequest = { leaving = false }) {
        PaperCard {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                PracticeTitle("Sair da rodada?")
                PracticeBody("Esta rodada é de visitante e não será salva na conta. Você pode continuar enquanto esta tela estiver aberta.")
                PaperButton("Continuar rodada", { leaving = false; round = round.resume(SystemClock.elapsedRealtime(), System.currentTimeMillis()) })
                PaperButton("Sair da rodada", { leaving = false; round = MathArcadeRound(); route = "map" }, style = PaperButtonStyle.Quiet)
            }
        }
    }
}

@Composable
fun MathCourseMap(courses: List<PracticeCourse>, index: Int, avatarId: String, onSelect: (Int) -> Unit, onBack: () -> Unit, onExplore: () -> Unit, onOpenAccount: () -> Unit) {
    val course = courses[index]
    PracticeColumn {
        PaperButton("Voltar às ilhas", onBack, style = PaperButtonStyle.Quiet)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            PaperButton("Anterior", { onSelect(index - 1) }, enabled = index > 0, style = PaperButtonStyle.Quiet, horizontalPadding = 12.dp)
            Text("${index + 1} de ${courses.size}", color = OlenaTheme.colors.muted)
            PaperButton("Próximo", { onSelect(index + 1) }, enabled = index < courses.lastIndex, style = PaperButtonStyle.Quiet, horizontalPadding = 12.dp)
        }
        Box(Modifier.fillMaxWidth().height(240.dp), contentAlignment = Alignment.Center) {
            CourseArt(course.id, Modifier.fillMaxSize())
            Image(painterResource(avatarArt(avatarId)), "Seu avatar", Modifier.align(Alignment.BottomCenter).size(64.dp))
        }
        PracticeBody(course.subject)
        PracticeTitle(course.title)
        PracticeBody(course.topics.joinToString(" · "))
        if (index == 0) {
            PaperButton("Explorar ${course.subject}", onExplore)
            GuestNotice()
        } else {
            PaperCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PracticeTitle("Progresso da conta necessário")
                    PracticeBody("Este percurso depende da conclusão do anterior. O login Android ainda está em preparação. Entre pelo site para consultar e continuar seu progresso.")
                    PaperButton("Ver minha conta", onOpenAccount, style = PaperButtonStyle.Quiet)
                }
            }
        }
    }
}

@Composable
fun MathRoundContent(round: MathArcadeRound, bank: MathQuestionBank, onAnswer: (Double) -> Unit, onPause: () -> Unit, onResume: () -> Unit, onContinue: () -> Unit, onReview: () -> Unit, onRetry: () -> Unit, onBack: () -> Unit) {
    val question = if (round.stage == "feedback") requireNotNull(round.last) else round.question(bank)
    val colors = OlenaTheme.colors
    val firstAnswer = remember { FocusRequester() }
    LaunchedEffect(round.stage, round.paused, question.entry.seed) {
        if (round.stage == "playing" && !round.paused) firstAnswer.requestFocus()
    }
    PracticeColumn(Modifier.onPreviewKeyEvent { event ->
        val index = when (event.key) { Key.One -> 0; Key.Two -> 1; Key.Three -> 2; Key.Four -> 3; else -> -1 }
        if (index >= 0 && event.type == KeyEventType.KeyUp && !event.isCtrlPressed && !event.isAltPressed && round.stage == "playing" && !round.paused) { onAnswer(question.choices[index]); true } else false
    }) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            PaperButton("Sair", onBack, style = PaperButtonStyle.Quiet)
            if (round.stage in setOf("playing", "countdown", "feedback") && !round.paused) PaperButton("Pausar", onPause, style = PaperButtonStyle.Quiet)
        }
        if (round.paused && round.stage in setOf("playing", "countdown", "feedback")) {
            PracticeTitle("Rodada pausada")
            PracticeBody("O tempo está parado. Continue quando estiver pronto.")
            PaperButton("Continuar", onResume)
        } else when (round.stage) {
            "countdown" -> {
                PracticeTitle("Prepare-se")
                Text(ceil(3 - round.stageElapsed).toInt().coerceAtLeast(1).toString(), fontSize = 76.sp, color = colors.text,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
            }
            "milestone" -> {
                PracticeTitle(if (round.progress.confirmed == 63) "Percurso concluído nesta sessão!" else "Domínio confirmado!")
                PracticeBody("Você acertou pelo menos quatro das cinco questões de confirmação.")
                GuestNotice()
                PaperButton("Continuar", onContinue)
            }
            "review" -> {
                val missed = round.missed[round.reviewIndex]
                PracticeTitle("Vamos revisar")
                PracticeBody("${round.reviewIndex + 1} de ${round.missed.size}. Sem cronômetro.")
                PaperCard {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        PracticeTitle(missed.question.entry.expression)
                        PracticeBody(missed.choice?.let { "Sua resposta: ${mathNumber(it)}" } ?: "O tempo acabou antes da resposta.")
                        PracticeBody("Resposta correta: ${mathNumber(missed.question.entry.answer)}")
                        PracticeBody(missed.question.entry.review)
                    }
                }
                PaperButton(if (round.reviewIndex + 1 == round.missed.size) "Ver resultado" else "Próxima revisão", onReview)
            }
            "results" -> {
                PracticeTitle("Rodada concluída")
                PracticeBody("${round.points} pontos nesta rodada")
                PracticeBody("${round.progress.correct} respostas corretas nesta sessão de prática.")
                GuestNotice()
                PaperButton("Tentar novamente", onRetry)
                PaperButton("Voltar aos percursos", onBack, style = PaperButtonStyle.Quiet)
            }
            else -> {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(Modifier.semantics(mergeDescendants = true) { contentDescription = "${round.lives} de 3 vidas" }, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        repeat(3) { heart -> Image(painterResource(R.drawable.ic_practice_heart), null, Modifier.size(28.dp), alpha = if (heart < round.lives) 1f else 0.2f) }
                    }
                    Text("${round.points} pontos", color = colors.text)
                }
                PracticeBody(when (question.phase) { "final" -> "Confirmação de domínio: ${(question.position ?: 0) + 1} de 5"; "recovery" -> "Retomando um desafio"; else -> question.entry.topic })
                val seconds = ceil(if (round.stage == "feedback") 0.0 else round.remaining(bank)).toInt()
                Text(if (round.stage == "feedback") "Tempo pausado" else "Tempo: ${seconds}s", color = colors.text, style = MaterialTheme.typography.titleMedium)
                PracticeTitle(question.entry.expression)
                question.choices.chunked(2).forEachIndexed { row, choices ->
                    Row(Modifier.fillMaxWidth().widthIn(max = 620.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        choices.forEachIndexed { column, choice ->
                            PaperButton(mathNumber(choice), { onAnswer(choice) }, Modifier.weight(1f).heightIn(min = 64.dp)
                                .then(if (row == 0 && column == 0) Modifier.focusRequester(firstAnswer) else Modifier)
                                .semantics { contentDescription = "Opção ${row * 2 + column + 1}: ${mathNumber(choice)}" },
                                style = PaperButtonStyle.Quiet, enabled = round.stage == "playing")
                        }
                    }
                }
                if (round.stage == "feedback") Text(
                    when { round.lastTimedOut -> "Tempo esgotado. Vamos revisar ao final."; round.lastCorrect -> "Correto!"; else -> "Ainda não. Vamos revisar ao final." },
                    color = colors.text, textAlign = TextAlign.Center, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                )
                Text("Use 1, 2, 3 ou 4 no teclado, ou escolha uma resposta.", color = colors.muted, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            }
        }
    }
}

fun mathNumber(number: Double): String = BigDecimal.valueOf(number).stripTrailingZeros().toPlainString().replace('.', ',')

@Composable
private fun GuestNotice() = PracticeBody("Rodada de visitante. Não salva progresso na conta. Para guardar seu progresso, entre pelo site enquanto o login Android está em preparação.")

@Composable
private fun PracticeTitle(text: String) = Text(text, color = OlenaTheme.colors.text, style = MaterialTheme.typography.headlineSmall,
    textAlign = TextAlign.Center, modifier = Modifier.semantics { heading() })

@Composable
private fun PracticeBody(text: String) = Text(text, color = OlenaTheme.colors.muted, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)

@Composable
private fun PracticeColumn(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(modifier.widthIn(max = 740.dp).fillMaxWidth().fillMaxHeight().verticalScroll(rememberScrollState()).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(18.dp), content = content)
    }
}

@Composable
private fun CourseArt(id: String, modifier: Modifier) {
    val art = when (id) {
        "foundations" -> R.drawable.art_practice_math_foundations
        "school" -> R.drawable.art_practice_math_school
        "advanced" -> R.drawable.art_practice_math_advanced
        "calculus1" -> R.drawable.art_practice_math_calculus1
        "calculus2" -> R.drawable.art_practice_math_calculus2
        else -> R.drawable.art_practice_math_calculus3
    }
    Image(painterResource(art), null, modifier)
}
