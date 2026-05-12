package expo.modules.nativevideoplayer

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

@OptIn(UnstableApi::class)
object VideoCacheSingleton {

    private const val CACHE_DIR_NAME   = "video_cache"
    private const val MAX_CACHE_BYTES  = 200L * 1024 * 1024   // 200 MB

    @Volatile
    private var instance: SimpleCache? = null

    fun getInstance(context: Context): SimpleCache {
        instance?.let { return it }

        return synchronized(this) {
            instance ?: buildCache(context.applicationContext).also { instance = it }
        }
    }

    fun release() {
        synchronized(this) {
            instance?.release()
            instance = null
        }
    }

    private fun buildCache(appContext: Context): SimpleCache {
        val cacheDir = File(appContext.cacheDir, CACHE_DIR_NAME).also { it.mkdirs() }
        val evictor  = LeastRecentlyUsedCacheEvictor(MAX_CACHE_BYTES)
        val dbProvider = androidx.media3.database.StandaloneDatabaseProvider(appContext)
        return SimpleCache(cacheDir, evictor, dbProvider)
    }
}
