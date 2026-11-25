package olenastudy.app.data.settings

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SettingFlagsTest {
    @Test
    fun `nomes de ajustes sao unicos`() {
        assertEquals(SettingFlags.all.size, SettingFlags.all.map { it.name }.toSet().size)
    }

    @Test
    fun `padroes iguais aos do site`() {
        // Vindos da varredura da tela de Configurações do site: ligados por padrão ...
        listOf(
            SettingFlags.SoundEffects, SettingFlags.Vibration, SettingFlags.SmartAdjust, SettingFlags.ShapeHold,
            SettingFlags.PredictPen, SettingFlags.HoverPreview, SettingFlags.WindowAdvance, SettingFlags.AutoCorrect,
            SettingFlags.AxisValues, SettingFlags.AxisEqual, SettingFlags.NotifyFollowers, SettingFlags.NotifyActivity,
            SettingFlags.NotifyAgenda, SettingFlags.NotifyNews, SettingFlags.NotifyXp, SettingFlags.ShareActivity,
        ).forEach { assertTrue(it.name, it.default) }
        // ... e desligados por padrão.
        listOf(SettingFlags.ReduceMotion, SettingFlags.HighlightSelections, SettingFlags.Notebook3d, SettingFlags.PenOnly)
            .forEach { assertFalse(it.name, it.default) }
    }
}
