package com.megabazar.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import com.google.accompanist.swiperefresh.SwipeRefresh
import com.google.accompanist.swiperefresh.rememberSwipeRefreshState
import com.megabazar.app.ui.OfflineScreen
import com.megabazar.app.ui.SplashScreen
import com.megabazar.app.ui.theme.EmeraldDark
import com.megabazar.app.ui.theme.EmeraldLight
import com.megabazar.app.ui.theme.MegaBazarTheme
import kotlinx.coroutines.delay
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {

    private val targetWebsiteUrl = "https://megabajar.com"
    private var webViewInstance: WebView? = null

    // File Chooser state variables
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MegaBazarTheme {
                MainAppScreen()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Composable
    private fun MainAppScreen() {
        var showSplash by remember { mutableStateOf(true) }
        var isOffline by remember { mutableStateOf(false) }
        var isRefreshing by remember { mutableStateOf(false) }
        var loadProgress by remember { mutableIntStateOf(0) }
        var lastBackPressTime by remember { mutableLongStateOf(0L) }

        // Camera / File Picker Launcher
        val filePickerLauncher = rememberLauncherForActivityResult(
            contract = ActivityResultContracts.StartActivityForResult()
        ) { result ->
            if (result.resultCode == Activity.RESULT_OK) {
                val data = result.data
                val results: Array<Uri>? = when {
                    data?.dataString != null -> arrayOf(Uri.parse(data.dataString))
                    data?.clipData != null -> {
                        val count = data.clipData!!.itemCount
                        Array(count) { i -> data.clipData!!.getItemAt(i).uri }
                    }
                    cameraImageUri != null -> arrayOf(cameraImageUri!!)
                    else -> null
                }
                filePathCallback?.onReceiveValue(results)
            } else {
                filePathCallback?.onReceiveValue(null)
            }
            filePathCallback = null
            cameraImageUri = null
        }

        // Auto-dismiss native splash after delay
        LaunchedEffect(Unit) {
            delay(1200)
            showSplash = false
        }

        // Double-Back-to-Exit or WebView Back navigation
        BackHandler {
            val webView = webViewInstance
            if (webView != null && webView.canGoBack()) {
                webView.goBack()
            } else {
                val currentTime = System.currentTimeMillis()
                if (currentTime - lastBackPressTime < 2000L) {
                    finish()
                } else {
                    lastBackPressTime = currentTime
                    Toast.makeText(this@MainActivity, "অ্যাপ থেকে বের হতে আবার ব্যাক চাপুন", Toast.LENGTH_SHORT).show()
                }
            }
        }

        Box(modifier = Modifier.fillMaxSize()) {
            if (isOffline) {
                OfflineScreen(
                    onRetry = {
                        isOffline = false
                        webViewInstance?.reload()
                    }
                )
            } else {
                SwipeRefresh(
                    state = rememberSwipeRefreshState(isRefreshing = isRefreshing),
                    onRefresh = {
                        isRefreshing = true
                        webViewInstance?.reload()
                    },
                    modifier = Modifier.fillMaxSize()
                ) {
                    AndroidView(
                        factory = { context ->
                            WebView(context).apply {
                                webViewInstance = this
                                WebViewManager.configureWebView(this, context)

                                webViewClient = MegaBazarWebClient(
                                    context = context,
                                    onPageLoadStart = {
                                        isOffline = false
                                    },
                                    onPageLoadFinished = {
                                        isRefreshing = false
                                        isOffline = false
                                    },
                                    onNetworkError = {
                                        isRefreshing = false
                                        isOffline = true
                                    }
                                )

                                webChromeClient = MegaBazarChromeClient(
                                    onProgressChange = { progress ->
                                        loadProgress = progress
                                        if (progress >= 100) {
                                            isRefreshing = false
                                        }
                                    },
                                    onOpenFileChooser = { callback, _ ->
                                        filePathCallback = callback
                                        openFileChooser(filePickerLauncher)
                                        true
                                    }
                                )

                                loadUrl(targetWebsiteUrl)
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }

                // Thin loading indicator at the top
                if (loadProgress in 1..99) {
                    LinearProgressIndicator(
                        progress = { loadProgress / 100f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .align(Alignment.TopCenter),
                        color = EmeraldLight,
                        trackColor = EmeraldDark.copy(alpha = 0.2f)
                    )
                }
            }

            // Splash Overlay
            AnimatedVisibility(
                visible = showSplash,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                SplashScreen(onSplashFinished = { showSplash = false })
            }
        }

        DisposableEffect(Unit) {
            onDispose {
                webViewInstance?.destroy()
                webViewInstance = null
            }
        }
    }

    private fun openFileChooser(launcher: androidx.activity.result.ActivityResultLauncher<Intent>) {
        val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        try {
            val photoFile = createImageFile()
            cameraImageUri = FileProvider.getUriForFile(
                this,
                "com.megabazar.app.fileprovider",
                photoFile
            )
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
        } catch (ex: IOException) {
            ex.printStackTrace()
        }

        val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "application/pdf"))
        }

        val intentArray = if (cameraImageUri != null) arrayOf(takePictureIntent) else emptyArray()
        val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
            putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
            putExtra(Intent.EXTRA_TITLE, "ফাইল বা ছবি নির্বাচন করুন")
            putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray)
        }

        launcher.launch(chooserIntent)
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("JPEG_${timeStamp}_", ".jpg", storageDir)
    }

    override fun onResume() {
        super.onResume()
        webViewInstance?.onResume()
    }

    override fun onPause() {
        super.onPause()
        webViewInstance?.onPause()
        WebViewManager.syncCookies()
    }

    override fun onDestroy() {
        super.onDestroy()
        webViewInstance?.destroy()
        webViewInstance = null
    }
}
