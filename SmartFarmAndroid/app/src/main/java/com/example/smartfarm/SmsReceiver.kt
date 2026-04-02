package com.example.smartfarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

// ─────────────────────────────────────────────────────────────────────────────
// SmsReceiver — listens for incoming SMS from the SIM800L hardware
// When hardware replies with "LOC:18.7645,73.4120", this picks it up
// and sends it to the server without needing Twilio
// ─────────────────────────────────────────────────────────────────────────────

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)

        for (message in messages) {
            val sender = message.displayOriginatingAddress ?: continue
            val body   = message.messageBody?.trim() ?: continue

            Log.d("SmsReceiver", "SMS from $sender: $body")

            // ── Handle location reply from hardware ───────────────────────
            if (body.startsWith("LOC:")) {
                handleLocationSms(context, sender, body)
            }

            // ── Handle status reply from hardware ─────────────────────────
            if (body.startsWith("STATUS:")) {
                handleStatusSms(context, sender, body)
            }
        }
    }

    private fun handleLocationSms(context: Context, sender: String, body: String) {
        // Parse: "LOC:18.7645,73.4120"
        val coords = body.removePrefix("LOC:").trim()
        val parts  = coords.split(",")
        if (parts.size != 2) return

        val lat = parts[0].toDoubleOrNull() ?: return
        val lng = parts[1].toDoubleOrNull() ?: return

        // Post to your API server in background
        Thread {
            try {
                val url  = java.net.URL("${MainActivity.WEB_APP_URL}/api/location/sms-webhook")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
                conn.doOutput = true

                val data = "From=${java.net.URLEncoder.encode(sender, "UTF-8")}" +
                        "&Body=${java.net.URLEncoder.encode(body, "UTF-8")}"

                conn.outputStream.write(data.toByteArray())
                conn.outputStream.flush()

                val responseCode = conn.responseCode
                Log.d("SmsReceiver", "Location posted to server: $responseCode")
                conn.disconnect()

            } catch (e: Exception) {
                Log.e("SmsReceiver", "Failed to post location", e)
            }
        }.start()

        // Show notification to user
        showNotification(
            context,
            "📍 Device Location Received",
            "Lat: $lat, Lng: $lng"
        )
    }

    private fun handleStatusSms(context: Context, sender: String, body: String) {
        // Forward to server just like location
        Thread {
            try {
                val url  = java.net.URL("${MainActivity.WEB_APP_URL}/api/location/sms-webhook")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
                conn.doOutput = true

                val data = "From=${java.net.URLEncoder.encode(sender, "UTF-8")}" +
                        "&Body=${java.net.URLEncoder.encode(body, "UTF-8")}"

                conn.outputStream.write(data.toByteArray())
                conn.outputStream.flush()
                conn.disconnect()
            } catch (e: Exception) {
                Log.e("SmsReceiver", "Failed to post status", e)
            }
        }.start()
    }

    private fun showNotification(context: Context, title: String, message: String) {
        val notificationManager = context.getSystemService(
            Context.NOTIFICATION_SERVICE
        ) as android.app.NotificationManager

        val notification = androidx.core.app.NotificationCompat
            .Builder(context, MainActivity.CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}