package olenastudy.app.ui.navigation

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import olenastudy.app.MainActivity
import olenastudy.app.R

/** Excluir a própria Activity evita devolver ao app um link que só o site entende. */
internal fun browserChooser(context: Context, url: String): Intent =
    Intent.createChooser(
        Intent(Intent.ACTION_VIEW, url.toUri()).addCategory(Intent.CATEGORY_BROWSABLE),
        context.getString(R.string.open_link_in_browser),
    ).putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, arrayOf(ComponentName(context, MainActivity::class.java)))
