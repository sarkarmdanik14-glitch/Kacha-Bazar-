package com.megabazar.app

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView

object WebViewManager {

    @SuppressLint("SetJavaScriptEnabled")
    fun configureWebView(webView: WebView, context: Context) {
        val settings = webView.settings

        // 1. JavaScript & DOM Storage
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true

        // 2. Cookie Management & Persistence
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // 3. Viewport & Rendering
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false

        // 4. Cache & Performance Optimization
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        // 5. File & Content Access
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        // 6. Media & Audio
        settings.mediaPlaybackRequiresUserGesture = false

        // 7. Multi-window / Popups
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.setSupportMultipleWindows(true)

        // 8. Custom App User Agent identifier
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent MegaBazarAndroid/1.0.0"

        // 9. Safe Browsing & Over-scroll
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = true
        }
        webView.overScrollMode = View.OVER_SCROLL_NEVER
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
    }

    fun syncCookies() {
        CookieManager.getInstance().flush()
    }
}
