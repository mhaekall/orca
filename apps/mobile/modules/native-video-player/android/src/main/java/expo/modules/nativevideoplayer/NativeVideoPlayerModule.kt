package expo.modules.nativevideoplayer

import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

@OptIn(UnstableApi::class)
class NativeVideoPlayerModule : Module() {

    override fun definition() = ModuleDefinition {

        Name("NativeVideoPlayer")

        View(NativeVideoPlayerView::class) {

            Events("onPlaybackEnd")

            Events("onProgress")

            Prop("videoUrl") { view: NativeVideoPlayerView, url: String? ->
                view.setVideoUrl(url)
            }

            Prop("headers") { view: NativeVideoPlayerView, headers: Map<String, String>? ->
                view.setHeaders(headers ?: emptyMap())
            }

            Prop("isPlaying") { view: NativeVideoPlayerView, isPlaying: Boolean ->
                view.setIsPlaying(isPlaying)
            }

            AsyncFunction("seekTo") { view: NativeVideoPlayerView, timeSeconds: Double ->
                view.seekTo(timeSeconds)
            }
        }
    }
}