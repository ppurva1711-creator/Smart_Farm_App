package com.example.smartfarm

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.ProgressBar
import android.widget.RelativeLayout
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import org.json.JSONObject
import java.util.Locale

// ─────────────────────────────────────────────────────────────────────────────
// Smart Farm Android App — MainActivity
// Loads the Next.js web app in a WebView and provides native Android features
// via a JavaScript bridge (window.AndroidBridge)
// ─────────────────────────────────────────────────────────────────────────────

class MainActivity : AppCompatActivity() {

    // ── Constants ─────────────────────────────────────────────────────────────
    companion object {
        // 👇 CHANGE THIS to your Vercel URL
        const val WEB_APP_URL = "https://smart-farm-app-ten.vercel.app"

        const val CHANNEL_ID       = "smart_farm_alerts"
        const val CHANNEL_NAME     = "Smart Farm Alerts"
        const val PREFS_NAME       = "SmartFarmPrefs"
        const val KEY_LANGUAGE     = "language"
        const val KEY_DEVICE_ID    = "sf_device_id"
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    private lateinit var webView:     WebView
    private lateinit var progressBar: ProgressBar

    // ── Location ──────────────────────────────────────────────────────────────
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var pendingLocationCallback: String? = null

    // ── Permission launcher ───────────────────────────────────────────────────
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        if (locationGranted && pendingLocationCallback != null) {
            fetchLocation(pendingLocationCallback!!)
            pendingLocationCallback = null
        }
        // Notify web app of permission results
        webView.post {
            webView.evaluateJavascript(
                "window.onPermissionResult && window.onPermissionResult(${permissions.entries.associate { it.key to it.value }})",
                null
            )
        }
    }

    // ── onCreate ──────────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Full screen, status bar transparent
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = Color.parseColor("#2E7D32")
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // ── Build layout programmatically ─────────────────────────────────────
        val layout = RelativeLayout(this).apply {
            setBackgroundColor(Color.parseColor("#2E7D32"))
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = RelativeLayout.LayoutParams(
                RelativeLayout.LayoutParams.MATCH_PARENT, 8
            ).also { it.addRule(RelativeLayout.ALIGN_PARENT_TOP) }
            max        = 100
            visibility = View.VISIBLE
            progressTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#81C784"))
        }

        webView = WebView(this).apply {
            layoutParams = RelativeLayout.LayoutParams(
                RelativeLayout.LayoutParams.MATCH_PARENT,
                RelativeLayout.LayoutParams.MATCH_PARENT
            )
        }

        layout.addView(webView)
        layout.addView(progressBar)
        setContentView(layout)

        // ── Init services ─────────────────────────────────────────────────────
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()

        // ── Configure WebView ─────────────────────────────────────────────────
        setupWebView()

        // ── Request all permissions upfront ──────────────────────────────────
        requestAllPermissions()

        // ── Load app ──────────────────────────────────────────────────────────
        if (isNetworkAvailable()) {
            webView.loadUrl(WEB_APP_URL)
        } else {
            webView.loadData(offlineHtml(), "text/html", "UTF-8")
        }
    }

    // ── WebView Setup ─────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled          = true
            domStorageEnabled          = true
            databaseEnabled            = true
            allowFileAccess            = true
            allowContentAccess         = true
            loadWithOverviewMode       = true
            useWideViewPort            = true
            setSupportZoom(false)
            builtInZoomControls        = false
            displayZoomControls        = false
            mixedContentMode           = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            cacheMode                  = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            userAgentString            = userAgentString + " SmartFarmApp/1.0 Android"
        }

        // ── JavaScript Bridge ─────────────────────────────────────────────────
        // The web app calls window.AndroidBridge.methodName() for native features
        webView.addJavascriptInterface(SmartFarmBridge(), "AndroidBridge")

        // ── WebViewClient ─────────────────────────────────────────────────────
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE

                // Inject device info into web app after page loads
                injectDeviceInfo()
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?,
                                         error: WebResourceError?) {
                if (request?.isForMainFrame == true) {
                    view?.loadData(offlineHtml(), "text/html", "UTF-8")
                }
            }

            // Allow all URLs to load inside WebView (no external browser)
            override fun shouldOverrideUrlLoading(view: WebView?,
                                                   request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                return if (url.startsWith("http") || url.startsWith("https")) {
                    view?.loadUrl(url)
                    true
                } else false
            }
        }

        // ── WebChromeClient (for JS alerts, file upload, etc.) ────────────────
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress == 100) View.GONE else View.VISIBLE
            }

            override fun onJsAlert(view: WebView?, url: String?,
                                    message: String?, result: JsResult?): Boolean {
                result?.confirm()
                return true
            }

            // Required for Firebase Phone Auth reCAPTCHA
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        // Enable cookies
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }
    }

    // ── JavaScript Bridge ─────────────────────────────────────────────────────
    // All methods callable from web app via: window.AndroidBridge.methodName()
    inner class SmartFarmBridge {

        // ── Get device language ───────────────────────────────────────────────
        @JavascriptInterface
        fun getDeviceLanguage(): String {
            val lang = Locale.getDefault().language
            return when (lang) {
                "hi" -> "hi"
                "mr" -> "mr"
                "pa" -> "pa"
                "te" -> "te"
                "ta" -> "ta"
                else -> "en"
            }
        }

        // ── Check if running inside Android app ───────────────────────────────
        @JavascriptInterface
        fun isAndroidApp(): Boolean = true

        // ── Get device ID ─────────────────────────────────────────────────────
        @JavascriptInterface
        fun getDeviceId(): String {
            return getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_DEVICE_ID, "") ?: ""
        }

        // ── Save device ID ────────────────────────────────────────────────────
        @JavascriptInterface
        fun saveDeviceId(deviceId: String) {
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putString(KEY_DEVICE_ID, deviceId).apply()
        }

        // ── Request GPS location ──────────────────────────────────────────────
        // Web app calls: AndroidBridge.requestLocation("callbackFunctionName")
        // Android fetches GPS and calls: window.callbackFunctionName({lat, lng})
        @JavascriptInterface
        fun requestLocation(callbackName: String) {
            if (ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                fetchLocation(callbackName)
            } else {
                pendingLocationCallback = callbackName
                permissionLauncher.launch(arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ))
            }
        }

        // ── Show native Android notification ─────────────────────────────────
        @JavascriptInterface
        fun showNotification(title: String, message: String) {
            val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            val notification = NotificationCompat.Builder(this@MainActivity, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setColor(Color.parseColor("#2E7D32"))
                .build()
            notificationManager.notify(System.currentTimeMillis().toInt(), notification)
        }

        // ── Check network status ──────────────────────────────────────────────
        @JavascriptInterface
        fun isNetworkAvailable(): Boolean = this@MainActivity.isNetworkAvailable()

        // ── Vibrate for feedback ──────────────────────────────────────────────
        @JavascriptInterface
        fun vibrate() {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(android.os.VibratorManager::class.java)
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(android.os.Vibrator::class.java)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(android.os.VibrationEffect.createOneShot(
                    100, android.os.VibrationEffect.DEFAULT_AMPLITUDE
                ))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(100)
            }
        }

        // ── Share text (WhatsApp, etc.) ───────────────────────────────────────
        @JavascriptInterface
        fun shareText(text: String) {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
            }
            startActivity(Intent.createChooser(intent, "Share via"))
        }

        // ── Open Google Maps with coordinates ─────────────────────────────────
        @JavascriptInterface
        fun openMaps(lat: Double, lng: Double) {
            val uri = android.net.Uri.parse("geo:$lat,$lng?q=$lat,$lng(Smart Farm Device)")
            val intent = Intent(Intent.ACTION_VIEW, uri)
            intent.setPackage("com.google.android.apps.maps")
            if (intent.resolveActivity(packageManager) != null) {
                startActivity(intent)
            } else {
                // Fallback to browser
                val browserIntent = Intent(Intent.ACTION_VIEW,
                    android.net.Uri.parse("https://maps.google.com/?q=$lat,$lng"))
                startActivity(browserIntent)
            }
        }

        // ── Get Android version info ──────────────────────────────────────────
        @JavascriptInterface
        fun getAppInfo(): String {
            return JSONObject().apply {
                put("androidVersion", Build.VERSION.RELEASE)
                put("appVersion",     "1.0.0")
                put("deviceModel",    "${Build.MANUFACTURER} ${Build.MODEL}")
                put("isAndroid",      true)
            }.toString()
        }
    }

    // ── Fetch GPS Location ────────────────────────────────────────────────────
    private fun fetchLocation(callbackName: String) {
        if (ActivityCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return
        }

        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
            .setWaitForAccurateLocation(false)
            .setMinUpdateIntervalMillis(2000)
            .setMaxUpdates(1)
            .build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    fusedLocationClient.removeLocationUpdates(this)
                    val location: Location = result.lastLocation ?: return
                    val json = JSONObject().apply {
                        put("lat",      location.latitude)
                        put("lng",      location.longitude)
                        put("accuracy", location.accuracy)
                        put("source",   "gps")
                    }.toString()
                    // Call back into JavaScript
                    webView.post {
                        webView.evaluateJavascript(
                            "window.$callbackName && window.$callbackName($json)", null
                        )
                    }
                }
            },
            Looper.getMainLooper()
        )

        // Also try last known location as fallback
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                val json = JSONObject().apply {
                    put("lat",      location.latitude)
                    put("lng",      location.longitude)
                    put("accuracy", location.accuracy)
                    put("source",   "cached")
                }.toString()
                webView.post {
                    webView.evaluateJavascript(
                        "window.$callbackName && window.$callbackName($json)", null
                    )
                }
            }
        }
    }

    // ── Inject device info into web app ───────────────────────────────────────
    private fun injectDeviceInfo() {
        val prefs    = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val deviceId = prefs.getString(KEY_DEVICE_ID, "") ?: ""
        val language = prefs.getString(KEY_LANGUAGE,  "en") ?: "en"

        val script = """
            // Tell web app it's running inside Android
            window.__ANDROID_APP__ = true;
            window.__DEVICE_ID__   = '$deviceId';
            
            // Set localStorage values that the web app reads
            try {
                localStorage.setItem('sf_device_id', '$deviceId');
            } catch(e) {}
            
            // Auto-set language if saved
            if ('$language' !== 'en') {
                try {
                    localStorage.setItem('sf_language', '$language');
                } catch(e) {}
            }
            
            // Notify web app that Android bridge is ready
            window.dispatchEvent(new Event('AndroidBridgeReady'));
            
            console.log('Android bridge injected. deviceId: $deviceId');
        """.trimIndent()

        webView.evaluateJavascript(script, null)
    }

    // ── Request all permissions at startup ────────────────────────────────────
    private fun requestAllPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        )

        // SMS permissions
        permissions.add(Manifest.permission.RECEIVE_SMS)
        permissions.add(Manifest.permission.READ_SMS)

        // Notifications (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val notGranted = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (notGranted.isNotEmpty()) {
            permissionLauncher.launch(notGranted.toTypedArray())
        }
    }

    // ── Network check ─────────────────────────────────────────────────────────
    private fun isNetworkAvailable(): Boolean {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    // ── Notification channel ──────────────────────────────────────────────────
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description     = "Smart Farm valve and sensor alerts"
                enableLights(true)
                lightColor      = Color.GREEN
                enableVibration(true)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    // ── Offline HTML ──────────────────────────────────────────────────────────
    private fun offlineHtml() = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: sans-serif; text-align: center;
                       background: #E8F5E9; margin: 0; padding: 40px 20px; }
                .icon { font-size: 64px; margin: 40px 0 20px; }
                h2 { color: #2E7D32; }
                p  { color: #666; font-size: 14px; }
                button { background: #2E7D32; color: white; border: none;
                         padding: 14px 28px; border-radius: 12px;
                         font-size: 16px; margin-top: 20px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="icon">🌾</div>
            <h2>No Internet Connection</h2>
            <p>Please check your network and try again.</p>
            <button onclick="location.reload()">Retry</button>
        </body>
        </html>
    """.trimIndent()

    // ── Handle back button ────────────────────────────────────────────────────
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    // ── Resume WebView ────────────────────────────────────────────────────────
    override fun onResume()  { super.onResume();  webView.onResume()  }
    override fun onPause()   { super.onPause();   webView.onPause()   }
    override fun onDestroy() { super.onDestroy(); webView.destroy()   }
}
