package com.megabazar.app

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

class MegaBazarWebClient(
    private val context: Context,
    private val onPageLoadStart: () -> Unit,
    private val onPageLoadFinished: () -> Unit,
    private val onNetworkError: () -> Unit
) : WebViewClient() {

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        onPageLoadStart()
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        onPageLoadFinished()
        WebViewManager.syncCookies()
    }

    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val uri = request?.url ?: return false
        val url = uri.toString()

        // 1. Phone dialer
        if (url.startsWith("tel:")) {
            try {
                val intent = Intent(Intent.ACTION_DIAL, uri)
                context.startActivity(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return true
        }

        // 2. Email composer
        if (url.startsWith("mailto:")) {
            try {
                val intent = Intent(Intent.ACTION_SENDTO, uri)
                context.startActivity(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            return true
        }

        // 3. WhatsApp Direct Chat
        if (url.startsWith("whatsapp:") || url.contains("api.whatsapp.com") || url.contains("wa.me")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, uri)
                intent.setPackage("com.whatsapp")
                context.startActivity(intent)
                return true
            } catch (e: Exception) {
                // If WhatsApp app is not installed, open in default browser
                try {
                    val browserIntent = Intent(Intent.ACTION_VIEW, uri)
                    context.startActivity(browserIntent)
                    return true
                } catch (bErr: Exception) {
                    bErr.printStackTrace()
                }
            }
        }

        // 4. Android Native Intents (e.g. bKash / Nagad payment app intents)
        if (url.startsWith("intent:")) {
            try {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                if (intent != null) {
                    val packageManager = context.packageManager
                    val info = packageManager.resolveActivity(intent, 0)
                    if (info != null) {
                        context.startActivity(intent)
                    } else {
                        val fallbackUrl = intent.getStringExtra("browser_fallback_url")
                        if (!fallbackUrl.isNullOrEmpty()) {
                            view?.loadUrl(fallbackUrl)
                        }
                    }
                    return true
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // 5. Internal Mega Bajar & Payment Gateway urls stay in WebView
        val host = uri.host ?: ""
        if (host.contains("megabajar.com") ||
            host.contains("bkash.com") ||
            host.contains("nagad.com.bd") ||
            host.contains("sslcommerz.com") ||
            host.contains("supabase.co")
        ) {
            return false // Load inside WebView
        }

        // 6. External social media or external sites: open in external browser
        try {
            val intent = Intent(Intent.ACTION_VIEW, uri)
            context.startActivity(intent)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        super.onReceivedError(view, request, error)
        // Trigger offline screen only for main frame errors
        if (request?.isForMainFrame == true) {
            onNetworkError()
        }
    }
}
