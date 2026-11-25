package olenastudy.app.domain.qr

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class QrCodeTest {
    @Test
    fun matrizIgualADaBibliotecaDoSite() {
        for (vector in QrVectors.all) {
            val matrix = QrCode.encode(vector.text, vector.level)
            assertEquals("versão de ${vector.text.take(30)} ${vector.level}", vector.version * 4 + 17, matrix.size)
            for (row in 0 until matrix.size) {
                val got = (0 until matrix.size).joinToString("") { if (matrix.dark(row, it)) "1" else "0" }
                assertEquals("linha $row de ${vector.text.take(30)} ${vector.level}", vector.rows[row], got)
            }
        }
    }

    @Test
    fun linkDoPerfilUsaOMenorTamanhoPossivel() {
        assertEquals(41, QrCode.encode("https://olenastudy.app/perfil?usuario=oliver644", QrLevel.H).size)
    }

    @Test
    fun textoGrandeDemaisFalhaEmVezDeGerarQrErrado() {
        assertThrows(IllegalArgumentException::class.java) { QrCode.encode("x".repeat(300), QrLevel.M) }
        assertTrue(QrCode.byteCapacity(10, QrLevel.M) >= 213)
    }
}
