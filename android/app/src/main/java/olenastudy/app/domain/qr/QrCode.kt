package olenastudy.app.domain.qr

/** Nível de correção de erro do QR. O site usa H (cabe a logo no meio); M fica disponível para textos longos. */
enum class QrLevel(val formatBits: Int) {
    M(0),
    H(2),
}

/** Matriz pronta do QR: `dark(linha, coluna)` diz se o módulo é escuro. */
class QrMatrix(val size: Int, private val cells: BooleanArray) {
    fun dark(row: Int, column: Int): Boolean = cells[row * size + column]

    override fun toString(): String = (0 until size).joinToString("\n") { row -> (0 until size).joinToString("") { if (dark(row, it)) "1" else "0" } }
}

/**
 * Codificador de QR em Kotlin puro (ISO 18004), versões 1 a 10, modo byte, correção M ou H.
 *
 * A máscara é escolhida pela menor penalidade, com a mesma regra da biblioteca `qrcode-generator`
 * que o site usa, então a matriz sai idêntica à do site. Nada vai à rede: o QR nasce no aparelho.
 */
object QrCode {
    const val MAX_VERSION = 10

    // [blocos do grupo 1, dados por bloco do grupo 1, blocos do grupo 2, dados por bloco do grupo 2, correção por bloco]
    private val BLOCKS_M = arrayOf(
        intArrayOf(1, 16, 0, 0, 10), intArrayOf(1, 28, 0, 0, 16), intArrayOf(1, 44, 0, 0, 26), intArrayOf(2, 32, 0, 0, 18),
        intArrayOf(2, 43, 0, 0, 24), intArrayOf(4, 27, 0, 0, 16), intArrayOf(4, 31, 0, 0, 18), intArrayOf(2, 38, 2, 39, 22),
        intArrayOf(3, 36, 2, 37, 22), intArrayOf(4, 43, 1, 44, 26),
    )
    private val BLOCKS_H = arrayOf(
        intArrayOf(1, 9, 0, 0, 17), intArrayOf(1, 16, 0, 0, 28), intArrayOf(2, 13, 0, 0, 22), intArrayOf(4, 9, 0, 0, 16),
        intArrayOf(2, 11, 2, 12, 22), intArrayOf(4, 15, 0, 0, 28), intArrayOf(4, 13, 1, 14, 26), intArrayOf(4, 14, 2, 15, 26),
        intArrayOf(4, 12, 4, 13, 24), intArrayOf(6, 15, 2, 16, 28),
    )
    private val ALIGNMENT = arrayOf(
        intArrayOf(), intArrayOf(6, 18), intArrayOf(6, 22), intArrayOf(6, 26), intArrayOf(6, 30), intArrayOf(6, 34),
        intArrayOf(6, 22, 38), intArrayOf(6, 24, 42), intArrayOf(6, 26, 46), intArrayOf(6, 28, 50),
    )

    private fun table(level: QrLevel) = if (level == QrLevel.M) BLOCKS_M else BLOCKS_H

    private fun dataCapacity(version: Int, level: QrLevel): Int {
        val row = table(level)[version - 1]
        return row[0] * row[1] + row[2] * row[3]
    }

    /** Maior texto (em bytes UTF-8) que cabe em `version` nesse nível. */
    fun byteCapacity(version: Int, level: QrLevel): Int {
        val lengthBits = if (version < 10) 8 else 16
        return (dataCapacity(version, level) * 8 - 4 - lengthBits) / 8
    }

    /** Codifica `text`. Falha com [IllegalArgumentException] se passar da versão 10. */
    fun encode(text: String, level: QrLevel = QrLevel.H): QrMatrix {
        val bytes = text.toByteArray(Charsets.UTF_8)
        val version = (1..MAX_VERSION).firstOrNull { bytes.size <= byteCapacity(it, level) }
            ?: throw IllegalArgumentException("Texto grande demais para o QR (${bytes.size} bytes)")
        val codewords = interleave(dataWords(bytes, version, level), version, level)
        // Como a biblioteca do site, a penalidade é medida com formato e versão ainda apagados.
        var mask = 0
        var bestPenalty = Double.MAX_VALUE
        for (candidate in 0..7) {
            val penalty = penalty(build(version, level, codewords, candidate, test = true))
            if (candidate == 0 || penalty < bestPenalty) {
                mask = candidate
                bestPenalty = penalty
            }
        }
        val best = build(version, level, codewords, mask, test = false)
        val size = version * 4 + 17
        val cells = BooleanArray(size * size)
        for (row in 0 until size) for (column in 0 until size) cells[row * size + column] = best[row][column]
        return QrMatrix(size, cells)
    }

    private fun dataWords(bytes: ByteArray, version: Int, level: QrLevel): IntArray {
        val capacityBits = dataCapacity(version, level) * 8
        val bits = ArrayList<Boolean>()
        fun put(value: Int, length: Int) {
            for (i in length - 1 downTo 0) bits.add((value shr i) and 1 == 1)
        }
        put(0b0100, 4)
        put(bytes.size, if (version < 10) 8 else 16)
        bytes.forEach { put(it.toInt() and 0xFF, 8) }
        repeat(minOf(4, capacityBits - bits.size)) { bits.add(false) }
        while (bits.size % 8 != 0) bits.add(false)
        val words = ArrayList<Int>()
        for (i in bits.indices step 8) {
            var word = 0
            for (j in 0 until 8) word = (word shl 1) or if (bits[i + j]) 1 else 0
            words.add(word)
        }
        var pad = 0xEC
        while (words.size < capacityBits / 8) {
            words.add(pad)
            pad = if (pad == 0xEC) 0x11 else 0xEC
        }
        return words.toIntArray()
    }

    private fun interleave(data: IntArray, version: Int, level: QrLevel): IntArray {
        val row = table(level)[version - 1]
        val eccLength = row[4]
        val sizes = List(row[0]) { row[1] } + List(row[2]) { row[3] }
        var offset = 0
        val dataBlocks = sizes.map { size -> data.copyOfRange(offset, offset + size).also { offset += size } }
        val eccBlocks = dataBlocks.map { reedSolomon(it, eccLength) }
        val out = ArrayList<Int>()
        for (i in 0 until (sizes.maxOrNull() ?: 0)) dataBlocks.forEach { if (i < it.size) out.add(it[i]) }
        for (i in 0 until eccLength) eccBlocks.forEach { out.add(it[i]) }
        return out.toIntArray()
    }

    private val EXP = IntArray(256)
    private val LOG = IntArray(256)

    init {
        var x = 1
        for (i in 0 until 255) {
            EXP[i] = x
            LOG[x] = i
            x = x shl 1
            if (x >= 256) x = x xor 0x11D
        }
        EXP[255] = EXP[0]
    }

    private fun multiply(a: Int, b: Int): Int = if (a == 0 || b == 0) 0 else EXP[(LOG[a] + LOG[b]) % 255]

    private fun reedSolomon(data: IntArray, eccLength: Int): IntArray {
        var generator = intArrayOf(1)
        for (i in 0 until eccLength) {
            val next = IntArray(generator.size + 1)
            for (j in generator.indices) {
                next[j] = next[j] xor generator[j]
                next[j + 1] = next[j + 1] xor multiply(generator[j], EXP[i])
            }
            generator = next
        }
        val result = data.copyOf(data.size + eccLength)
        for (i in data.indices) {
            val factor = result[i]
            if (factor != 0) for (j in generator.indices) result[i + j] = result[i + j] xor multiply(generator[j], factor)
        }
        return result.copyOfRange(data.size, data.size + eccLength)
    }

    private fun bch(value: Int, poly: Int): Int {
        var v = value
        val top = 31 - Integer.numberOfLeadingZeros(poly)
        while (31 - Integer.numberOfLeadingZeros(v) >= top) v = v xor (poly shl (31 - Integer.numberOfLeadingZeros(v) - top))
        return v
    }

    private fun build(version: Int, level: QrLevel, codewords: IntArray, mask: Int, test: Boolean): Array<BooleanArray> {
        val size = version * 4 + 17
        val grid = Array(size) { BooleanArray(size) }
        val reserved = Array(size) { BooleanArray(size) }
        fun set(row: Int, column: Int, dark: Boolean) {
            grid[row][column] = dark
            reserved[row][column] = true
        }
        for ((fr, fc) in listOf(0 to 0, 0 to size - 7, size - 7 to 0)) {
            for (r in -1..7) for (c in -1..7) {
                val row = fr + r
                val column = fc + c
                if (row !in 0 until size || column !in 0 until size) continue
                val dark = (r in 0..6 && (c == 0 || c == 6)) || (c in 0..6 && (r == 0 || r == 6)) || (r in 2..4 && c in 2..4)
                set(row, column, dark)
            }
        }
        val positions = ALIGNMENT[version - 1]
        for (r in positions) for (c in positions) {
            if (reserved[r][c]) continue
            for (dr in -2..2) for (dc in -2..2) set(r + dr, c + dc, maxOf(kotlin.math.abs(dr), kotlin.math.abs(dc)) != 1)
        }
        for (i in 8 until size - 8) {
            if (!reserved[6][i]) set(6, i, i % 2 == 0)
            if (!reserved[i][6]) set(i, 6, i % 2 == 0)
        }
        if (version >= 7) {
            val info = (version shl 12) or bch(version shl 12, 0x1F25)
            for (i in 0 until 18) {
                val dark = !test && (info shr i) and 1 == 1
                set(i / 3, size - 11 + i % 3, dark)
                set(size - 11 + i % 3, i / 3, dark)
            }
        }
        val format = (((level.formatBits shl 3) or mask) shl 10).let { (it or bch(it, 0x537)) xor 0x5412 }
        for (i in 0 until 15) {
            val dark = !test && (format shr i) and 1 == 1
            // Primeira cópia, em volta do finder superior esquerdo.
            when {
                i < 6 -> set(i, 8, dark)
                i == 6 -> set(7, 8, dark)
                i == 7 -> set(8, 8, dark)
                i == 8 -> set(8, 7, dark)
                else -> set(8, 14 - i, dark)
            }
            // Segunda cópia, repartida entre os outros dois finders.
            if (i < 8) set(8, size - 1 - i, dark) else set(size - 15 + i, 8, dark)
        }
        set(size - 8, 8, !test)
        var bit = 0
        val total = codewords.size * 8
        var upward = true
        var column = size - 1
        while (column > 0) {
            if (column == 6) column--
            for (step in 0 until size) {
                val row = if (upward) size - 1 - step else step
                for (c in 0..1) {
                    val x = column - c
                    if (reserved[row][x]) continue
                    var dark = bit < total && (codewords[bit / 8] shr (7 - bit % 8)) and 1 == 1
                    bit++
                    if (maskHit(mask, row, x)) dark = !dark
                    grid[row][x] = dark
                }
            }
            upward = !upward
            column -= 2
        }
        return grid
    }

    private fun maskHit(mask: Int, i: Int, j: Int): Boolean = when (mask) {
        0 -> (i + j) % 2 == 0
        1 -> i % 2 == 0
        2 -> j % 3 == 0
        3 -> (i + j) % 3 == 0
        4 -> (i / 2 + j / 3) % 2 == 0
        5 -> (i * j) % 2 + (i * j) % 3 == 0
        6 -> ((i * j) % 2 + (i * j) % 3) % 2 == 0
        else -> ((i * j) % 3 + (i + j) % 2) % 2 == 0
    }

    /** Mesma penalidade da `qrcode-generator` (4 regras, a de vizinhança conta quadros 3 x 3). */
    private fun penalty(g: Array<BooleanArray>): Double {
        val n = g.size
        var lost = 0.0
        for (row in 0 until n) for (col in 0 until n) {
            var same = 0
            for (r in -1..1) for (c in -1..1) {
                if (r == 0 && c == 0) continue
                val rr = row + r
                val cc = col + c
                if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue
                if (g[row][col] == g[rr][cc]) same++
            }
            if (same > 5) lost += 3 + same - 5
        }
        for (row in 0 until n - 1) for (col in 0 until n - 1) {
            val count = listOf(g[row][col], g[row + 1][col], g[row][col + 1], g[row + 1][col + 1]).count { it }
            if (count == 0 || count == 4) lost += 3
        }
        val pattern = booleanArrayOf(true, false, true, true, true, false, true)
        for (a in 0 until n) for (b in 0 until n - 6) {
            if ((0..6).all { g[a][b + it] == pattern[it] }) lost += 40
            if ((0..6).all { g[b + it][a] == pattern[it] }) lost += 40
        }
        val dark = g.sumOf { row -> row.count { it } }
        lost += kotlin.math.abs(100.0 * dark / n / n - 50) / 5 * 10
        return lost
    }
}
