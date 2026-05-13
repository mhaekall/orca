package expo.modules.nativevideoplayer

import android.content.Context
import android.util.Log
import android.widget.FrameLayout
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

@UnstableApi
class NativeVideoPlayerView(
    context: Context,
    appContext: AppContext
) : ExpoView(context, appContext) {

    private val TAG = "NativeVideoPlayerView"

    private val onPlaybackEnd by EventDispatcher()
    private val onProgress by EventDispatcher()
    private val onBufferingChange by EventDispatcher()

    private val playerView: PlayerView = PlayerView(context).apply {
        useController = false // DISABLED so React Native UI can take over
        layoutParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
    }

    private var player: ExoPlayer? = null
    private var currentUrl: String? = null
    private var currentHeaders: Map<String, String>? = null

    private var progressRunnable: Runnable? = null
    private val mainHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val PROGRESS_INTERVAL_MS = 1000L

    init {
        addView(playerView)
    }

    fun setVideoUrl(url: String?) {
        if (url == currentUrl) return
        currentUrl = url
        rebuildPlayer()
    }

    fun setHeaders(headers: Map<String, String>) {
        if (headers == currentHeaders) return
        currentHeaders = headers
        rebuildPlayer()
    }

    fun setIsPlaying(isPlaying: Boolean) {
        if (player?.playWhenReady != isPlaying) {
            player?.playWhenReady = isPlaying
            if (isPlaying) startProgressPolling() else stopProgressPolling()
        }
    }

    fun seekTo(seconds: Double) {
        val ms = (seconds * 1000).toLong()
        player?.seekTo(ms)
    }

    fun release() {
        releasePlayer()
    }

    private fun rebuildPlayer() {
        releasePlayer()
        val url = currentUrl?.takeIf { it.isNotBlank() } ?: return
        buildAndPreparePlayer(url)
    }

    private fun buildAndPreparePlayer(url: String) {

        val httpFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(15_000)

        currentHeaders?.let {
            httpFactory.setDefaultRequestProperties(it)
        }

        val cacheFactory = CacheDataSource.Factory()
            .setCache(VideoCacheSingleton.getInstance(context.applicationContext))
            .setUpstreamDataSourceFactory(httpFactory)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)

        // INJECTION: DefaultLoadControl for 5-minute buffer hack
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                5000,    // minBufferMs
                300000,  // maxBufferMs (5 minutes)
                2500,    // bufferForPlaybackMs
                5000     // bufferForPlaybackAfterRebufferMs
            )
            .build()

        val newPlayer = ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(cacheFactory))
            .setLoadControl(loadControl) // INJECTED LOAD CONTROL
            .build()
            .also { exo ->
                exo.repeatMode    = Player.REPEAT_MODE_OFF
                exo.playWhenReady = true
                exo.setMediaItem(MediaItem.fromUri(url))
                exo.prepare()
                exo.addListener(playerListener)
            }

        playerView.player = newPlayer
        player = newPlayer
        Log.d(TAG, "ExoPlayer prepared -> $url")
    }

    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(state: Int) {
            if (state == Player.STATE_ENDED) {
                stopProgressPolling()
                this@NativeVideoPlayerView.onPlaybackEnd(mapOf<String, Any>())
                Log.d(TAG, "onPlaybackEnd dispatched.")
            } else if (state == Player.STATE_BUFFERING) {
                this@NativeVideoPlayerView.onBufferingChange(mapOf("isBuffering" to true))
            } else if (state == Player.STATE_READY) {
                this@NativeVideoPlayerView.onBufferingChange(mapOf("isBuffering" to false))
            }
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
            if (isPlaying) startProgressPolling() else stopProgressPolling()
        }
    }

    private fun startProgressPolling() {
        stopProgressPolling()
        progressRunnable = object : Runnable {
            override fun run() {
                val exo = player ?: return
                val currentMs  = exo.currentPosition
                val durationMs = exo.duration.coerceAtLeast(0L)

                this@NativeVideoPlayerView.onProgress(
                    mapOf(
                        "currentTime" to currentMs  / 1_000.0,
                        "duration"    to durationMs / 1_000.0,
                    )
                )
                mainHandler.postDelayed(this, PROGRESS_INTERVAL_MS)
            }
        }
        mainHandler.post(progressRunnable!!)
    }

    private fun stopProgressPolling() {
        progressRunnable?.let { mainHandler.removeCallbacks(it) }
        progressRunnable = null
    }

    private fun releasePlayer() {
        stopProgressPolling()
        player?.apply {
            removeListener(playerListener)
            stop()
            release()
        }
        player = null
        playerView.player = null
    }
}
