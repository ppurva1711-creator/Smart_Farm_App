package com.example.smartfarm
import android.app.NotificationManager
import android.graphics.Color
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

// ─────────────────────────────────────────────────────────────────────────────
// FarmFirebaseMessagingService
// Handles push notifications from Firebase Cloud Messaging (FCM)
// Triggered when: valve status changes, battery low, power cut, etc.
// ─────────────────────────────────────────────────────────────────────────────

class FarmFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        val title   = remoteMessage.notification?.title
            ?: remoteMessage.data["title"]
            ?: "Smart Farm Alert"

        val body    = remoteMessage.notification?.body
            ?: remoteMessage.data["body"]
            ?: "Check your farm"

        showNotification(title, body)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Save FCM token to SharedPreferences
        getSharedPreferences(MainActivity.PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .apply()
    }

    private fun showNotification(title: String, body: String) {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(this, MainActivity.CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setColor(Color.parseColor("#2E7D32"))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}