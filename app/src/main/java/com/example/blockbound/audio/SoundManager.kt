package com.example.blockbound.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.CombinedVibration
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

/**
 * Procedural low-latency Audio and Haptic engine for Blockbound.
 * Generates custom synthesized SFX for board games (dice, coins, block slams, clangs, fanfares).
 */
class SoundManager(private val context: Context) {

    private val scope = CoroutineScope(Dispatchers.Default)
    private val sampleRate = 22050
    var isSoundEnabled: Boolean = true
    var isHapticsEnabled: Boolean = true

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vm?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    private fun playPcm(buffer: ShortArray) {
        if (!isSoundEnabled) return
        scope.launch {
            try {
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_GAME)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(buffer.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                track.write(buffer, 0, buffer.size)
                track.play()
                // Let it play, then release
                track.setNotificationMarkerPosition(buffer.size)
                track.setPlaybackPositionUpdateListener(object : AudioTrack.OnPlaybackPositionUpdateListener {
                    override fun onMarkerReached(t: AudioTrack?) {
                        t?.stop()
                        t?.release()
                    }
                    override fun onPeriodicNotification(t: AudioTrack?) {}
                })
            } catch (_: Exception) {}
        }
    }

    private fun vibrate(millis: Long, amplitude: Int = 180) {
        if (!isHapticsEnabled || vibrator == null) return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(millis, amplitude))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(millis)
            }
        } catch (_: Exception) {}
    }

    // --- SOUND EFFECTS ---

    /** Crisp UI click */
    fun playClick() {
        vibrate(10, 80)
        val numSamples = (sampleRate * 0.04).toInt()
        val buffer = ShortArray(numSamples)
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = 1.0 - progress
            val freq = 1200.0 - (progress * 400.0)
            val sample = sin(2.0 * PI * freq * i / sampleRate) * decay
            buffer[i] = (sample * 8000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Dice tumbling rattle */
    fun playDiceRattle() {
        vibrate(25, 120)
        val numSamples = (sampleRate * 0.12).toInt()
        val buffer = ShortArray(numSamples)
        val r = Random(System.nanoTime())
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = 1.0 - progress
            val noise = (r.nextDouble() * 2.0 - 1.0) * 0.4
            val tone = sin(2.0 * PI * 380.0 * i / sampleRate) * 0.6
            val sample = (noise + tone) * decay
            buffer[i] = (sample * 16000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Dice settle on table */
    fun playDiceSettle() {
        vibrate(35, 200)
        val numSamples = (sampleRate * 0.18).toInt()
        val buffer = ShortArray(numSamples)
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = (1.0 - progress) * (1.0 - progress)
            val freq = 220.0 * (1.0 - progress * 0.3)
            val sample = sin(2.0 * PI * freq * i / sampleRate) * decay
            buffer[i] = (sample * 24000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Token hop step on board tile */
    fun playHopStep(pitchScale: Float = 1.0f) {
        vibrate(12, 100)
        val numSamples = (sampleRate * 0.08).toInt()
        val buffer = ShortArray(numSamples)
        val baseFreq = 540.0 * pitchScale.coerceIn(0.8f, 1.4f)
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = 1.0 - progress
            val freq = baseFreq + (sin(progress * PI) * 120.0)
            val sample = sin(2.0 * PI * freq * i / sampleRate) * decay
            buffer[i] = (sample * 14000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Coin collect sparkling arpeggio */
    fun playCoinReward() {
        vibrate(20, 140)
        val duration = 0.25
        val numSamples = (sampleRate * duration).toInt()
        val buffer = ShortArray(numSamples)
        val notes = doubleArrayOf(784.0, 988.0, 1175.0, 1568.0) // G5, B5, D6, G6
        for (i in 0 until numSamples) {
            val noteIndex = ((i.toDouble() / numSamples) * notes.size).toInt().coerceIn(0, notes.size - 1)
            val noteProgress = (i % (numSamples / notes.size)).toDouble() / (numSamples / notes.size)
            val decay = 1.0 - noteProgress
            val sample = sin(2.0 * PI * notes[noteIndex] * i / sampleRate) * decay
            buffer[i] = (sample * 16000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Material / Gem collection crystal chime */
    fun playGemReward() {
        vibrate(20, 150)
        val numSamples = (sampleRate * 0.22).toInt()
        val buffer = ShortArray(numSamples)
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = (1.0 - progress) * (1.0 - progress)
            val s1 = sin(2.0 * PI * 1318.5 * i / sampleRate) // E6
            val s2 = sin(2.0 * PI * 1975.5 * i / sampleRate) * 0.5 // B6
            val sample = (s1 + s2) * decay
            buffer[i] = (sample * 15000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Voxel block snap / construction thud */
    fun playBlockSnap() {
        vibrate(25, 220)
        val numSamples = (sampleRate * 0.14).toInt()
        val buffer = ShortArray(numSamples)
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = 1.0 - progress
            val freq = 180.0 - (progress * 60.0)
            val sub = sin(2.0 * PI * freq * i / sampleRate) * 0.8
            val click = sin(2.0 * PI * 800.0 * i / sampleRate) * (if (progress < 0.2) 0.5 else 0.0)
            val sample = (sub + click) * decay
            buffer[i] = (sample * 24000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Building upgraded triumph */
    fun playUpgradeComplete() {
        vibrate(50, 255)
        val duration = 0.45
        val numSamples = (sampleRate * duration).toInt()
        val buffer = ShortArray(numSamples)
        val chordFreqs = doubleArrayOf(523.25, 659.25, 783.99, 1046.5) // C5, E5, G5, C6
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = (1.0 - progress)
            var sample = 0.0
            chordFreqs.forEach { f ->
                sample += sin(2.0 * PI * f * i / sampleRate) * 0.25
            }
            buffer[i] = (sample * decay * 22000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Metallic shield deflection */
    fun playShieldBlock() {
        vibrate(40, 230)
        val numSamples = (sampleRate * 0.25).toInt()
        val buffer = ShortArray(numSamples)
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = 1.0 - progress
            val ring = sin(2.0 * PI * 987.0 * i / sampleRate) * 0.6 +
                       sin(2.0 * PI * 1480.0 * i / sampleRate) * 0.4
            buffer[i] = (ring * decay * 20000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Raid explosive hammer smash */
    fun playRaidBlast() {
        vibrate(60, 255)
        val numSamples = (sampleRate * 0.35).toInt()
        val buffer = ShortArray(numSamples)
        val r = Random(System.nanoTime())
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val decay = 1.0 - progress
            val boom = sin(2.0 * PI * (90.0 - progress * 40.0) * i / sampleRate) * 0.7
            val debris = (r.nextDouble() * 2.0 - 1.0) * 0.5 * (1.0 - progress * 0.5)
            val sample = (boom + debris) * decay
            buffer[i] = (sample * 26000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }

    /** Mystery chest / Jackpot roll fanfare */
    fun playJackpotFanfare() {
        vibrate(70, 255)
        val duration = 0.6
        val numSamples = (sampleRate * duration).toInt()
        val buffer = ShortArray(numSamples)
        val arpeggio = doubleArrayOf(523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0)
        for (i in 0 until numSamples) {
            val progress = i.toDouble() / numSamples
            val noteIdx = ((progress * arpeggio.size * 1.5).toInt()) % arpeggio.size
            val decay = 1.0 - (progress * 0.4)
            val sample = sin(2.0 * PI * arpeggio[noteIdx] * i / sampleRate) * decay
            buffer[i] = (sample * 18000).toInt().coerceIn(-32767, 32767).toShort()
        }
        playPcm(buffer)
    }
}
