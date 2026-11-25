package olenastudy.app.focus

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import androidx.annotation.RawRes
import olenastudy.app.R

/** Os quatro efeitos do Pomodoro do site: começar, pausar, reiniciar e a mordida do tomate. */
enum class FocusSound(@RawRes val res: Int) {
    Start(R.raw.pomodoro_comecar),
    Pause(R.raw.pomodoro_pausar),
    Restart(R.raw.pomodoro_reiniciar),
    Bite(R.raw.pomodoro_mordida),
}

/** Toca os efeitos com SoundPool, sem segurar o áudio do aparelho além do necessário. */
class FocusSounds(context: Context) {
    private val pool: SoundPool =
        SoundPool.Builder()
            .setMaxStreams(2)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            .build()
    private val ids = FocusSound.entries.associateWith { pool.load(context, it.res, 1) }

    fun play(sound: FocusSound) {
        ids[sound]?.let { pool.play(it, 1f, 1f, 1, 0, 1f) }
    }

    fun release() = pool.release()
}
