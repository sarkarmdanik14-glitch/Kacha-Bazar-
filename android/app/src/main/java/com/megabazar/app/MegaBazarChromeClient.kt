package com.megabazar.app

import android.net.Uri
import android.os.Message
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView

class MegaBazarChromeClient(
    private val onProgressChange: (Int) -> Unit,
    private val onOpenFileChooser: (ValueCallback<Array<Uri>>?, WebChromeClient.FileChooserParams?) -> Boolean
) : WebChromeClient() {

    override fun onProgressChanged(view: WebView?, newProgress: Int) {
        super.onProgressChanged(view, newProgress)
        onProgressChange(newProgress)
    }

    override fun onShowFileChooser(
        webView: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?
    ): Boolean {
        return onOpenFileChooser(filePathCallback, fileChooserParams)
    }

    override fun onCreateWindow(
        view: WebView?,
        isDialog: Boolean,
        isUserGesture: Boolean,
        resultMsg: Message?
    ): Boolean {
        // Handle window.open inside the same webview so payment gateway popups don't crash
        val href = view?.handler?.obtainMessage()
        view?.requestFocusNodeHref(href)
        val url = href?.data?.getString("url")
        if (!url.isNullOrEmpty()) {
            view.loadUrl(url)
            return true
        }
        val transport = resultMsg?.obj as? WebView.WebViewTransport
        transport?.webView = view
        resultMsg?.sendToTarget()
        return true
    }
}
