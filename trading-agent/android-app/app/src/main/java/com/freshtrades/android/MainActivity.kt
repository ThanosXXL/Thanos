package com.freshtrades.android

import android.Manifest
import android.app.AlertDialog
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import java.util.Locale

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var questionInput: EditText
    private lateinit var searchView: WebView
    private lateinit var googleBtn: Button
    private lateinit var snipingBtn: Button
    private lateinit var vorlesenBtn: Button
    private lateinit var saveAsBtn: Button
    private lateinit var demoBanner: TextView

    private var textToSpeech: TextToSpeech? = null
    private var googleConnected = false
    private var snipingActive = false

    private val speechLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val transcript = result.data
            ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            ?.firstOrNull()
        if (!transcript.isNullOrBlank()) {
            questionInput.setText(transcript)
            performSearch(transcript)
        }
    }

    private val micPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            launchSpeechRecognizer()
        } else {
            Toast.makeText(this, R.string.mic_permission_denied, Toast.LENGTH_SHORT).show()
        }
    }

    private val saveFileLauncher = registerForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri ->
        if (uri != null) {
            searchView.evaluateJavascript("(function(){return document.body ? document.body.innerText : '';})()") { value ->
                val text = unescapeJs(value)
                contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray()) }
                Toast.makeText(this, getString(R.string.save_success, uri.toString()), Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        questionInput = findViewById(R.id.questionInput)
        searchView = findViewById(R.id.searchView)
        googleBtn = findViewById(R.id.googleBtn)
        snipingBtn = findViewById(R.id.snipingBtn)
        vorlesenBtn = findViewById(R.id.vorlesenBtn)
        saveAsBtn = findViewById(R.id.saveAsBtn)
        demoBanner = findViewById(R.id.demoBanner)
        val micBtn: Button = findViewById(R.id.micBtn)

        demoBanner.visibility = if (BuildConfig.IS_DEMO) TextView.VISIBLE else TextView.GONE

        searchView.settings.javaScriptEnabled = true
        searchView.settings.domStorageEnabled = true
        searchView.webViewClient = WebViewClient()

        textToSpeech = TextToSpeech(this, this)

        questionInput.setOnEditorActionListener { _, actionId, event ->
            val isSearchAction = actionId == EditorInfo.IME_ACTION_SEARCH
            val isEnterKey = event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN
            if (isSearchAction || isEnterKey) {
                performSearch(questionInput.text.toString())
                true
            } else {
                false
            }
        }

        micBtn.setOnClickListener { onMicClicked() }
        snipingBtn.setOnClickListener { onSnipingClicked() }
        vorlesenBtn.setOnClickListener { onVorlesenClicked() }
        saveAsBtn.setOnClickListener { onSaveAsClicked() }
        googleBtn.setOnClickListener { onGoogleClicked() }
    }

    private fun performSearch(rawQuery: String) {
        val query = rawQuery.trim()
        if (query.isEmpty()) return
        val url = "https://www.google.com/search?q=" + Uri.encode(query)
        searchView.loadUrl(url)
    }

    private fun onMicClicked() {
        val hasPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        if (hasPermission) {
            launchSpeechRecognizer()
        } else {
            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun launchSpeechRecognizer() {
        val intent = android.content.Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "de-DE")
        }
        try {
            speechLauncher.launch(intent)
        } catch (e: android.content.ActivityNotFoundException) {
            Toast.makeText(this, R.string.mic_not_available, Toast.LENGTH_SHORT).show()
        }
    }

    private fun onSnipingClicked() {
        val message = if (snipingActive) R.string.confirm_sniping_deactivate_message else R.string.confirm_sniping_activate_message
        confirmAction(message) {
            snipingActive = !snipingActive
            snipingBtn.isActivated = snipingActive
            snipingBtn.contentDescription = getString(if (snipingActive) R.string.sniping_active else R.string.sniping_default)
            Toast.makeText(this, R.string.sniping_toast, Toast.LENGTH_SHORT).show()
        }
    }

    private fun onVorlesenClicked() {
        confirmAction(R.string.confirm_vorlesen_message) {
            searchView.evaluateJavascript("(function(){return document.body ? document.body.innerText : '';})()") { value ->
                val text = unescapeJs(value).take(4000)
                if (text.isNotBlank()) {
                    textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "vorlesen")
                }
            }
        }
    }

    private fun onSaveAsClicked() {
        confirmAction(R.string.confirm_save_message) {
            saveFileLauncher.launch("freshtrades-suche.txt")
        }
    }

    private fun confirmAction(messageRes: Int, onConfirmed: () -> Unit) {
        AlertDialog.Builder(this, R.style.ThemeOverlay_FreshTrades_Dialog)
            .setTitle(R.string.confirm_title)
            .setMessage(messageRes)
            .setPositiveButton(R.string.confirm_yes) { dialog, _ ->
                dialog.dismiss()
                onConfirmed()
            }
            .setNegativeButton(R.string.confirm_cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun onGoogleClicked() {
        googleConnected = !googleConnected
        googleBtn.isActivated = googleConnected
        googleBtn.setText(if (googleConnected) R.string.google_button_connected else R.string.google_button_default)
    }

    private fun unescapeJs(raw: String?): String {
        if (raw == null || raw == "null") return ""
        return raw.trim('"')
            .replace("\\n", "\n")
            .replace("\\\"", "\"")
            .replace("\\\\", "\\")
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            textToSpeech?.language = Locale.GERMANY
        }
    }

    override fun onDestroy() {
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        super.onDestroy()
    }
}
