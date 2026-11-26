package olenastudy.app.domain.focus

import java.io.File
import org.junit.Assert.assertArrayEquals
import org.junit.Test

class FocusArtParityTest {
    @Test fun `tomate nativo usa o mesmo arquivo Rive da web`() {
        val root = File("../..").canonicalFile
        assertArrayEquals(
            File(root, "public/pomodoro-tomato/tomato.riv").readBytes(),
            File(root, "android/app/src/main/res/raw/focus_tomato.riv").readBytes(),
        )
    }
}
