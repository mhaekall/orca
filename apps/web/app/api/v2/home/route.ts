import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

// We define cache time
export const revalidate = 60; // 60 seconds Cache ISR

export async function GET(request: Request) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ success: false, error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  // Create a fresh neon connection (stateless, so no connection pool limits on edge)
  const sql = neon(dbUrl);

  try {
    const heroQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."synopsis", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score, m."nextAiringEpisode",
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0) as jikan_views,
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId" AND date >= CURRENT_DATE - INTERVAL '7 days'), 0) as local_trending
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY GREATEST(
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId" AND date >= CURRENT_DATE - INTERVAL '7 days'), 0),
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0)
        ) DESC, m.trending DESC NULLS LAST, m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 10
    `;

    const airingQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score, m."nextAiringEpisode",
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0) as jikan_views,
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE m.status = 'RELEASING' AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY GREATEST(
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0),
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0)
        ) DESC, m.popularity DESC NULLS LAST
        LIMIT 20
    `;

    const latestQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0) as jikan_views,
               max(e."episodeNumber") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               max(e."updatedAt") as last_up
        FROM anime_metadata m
        JOIN episodes e ON m."anilistId" = e."anilistId"
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE m.status != 'FINISHED' OR m.status IS NULL
        GROUP BY m."anilistId", c.id, c.title_preferred, m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity, m."totalEpisodes", c.episode_count_actual
        ORDER BY last_up DESC
        LIMIT 20
    `;

    const popularQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0) as jikan_views,
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY GREATEST(
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0),
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0)
        ) DESC, m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 20
    `;

    const completedQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score, 
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE m.status = 'FINISHED' AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY local_views DESC, m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 20
    `;

    const topRatedQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.score DESC NULLS LAST, local_views DESC, m.popularity DESC NULLS LAST
        LIMIT 20
    `;

    const isekaiQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE (m.genres::text ILIKE '%fantasy%' OR c.genres_local::text ILIKE '%fantasy%' OR c.genres_local::text ILIKE '%isekai%') 
          AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY local_views DESC, m.popularity DESC NULLS LAST
        LIMIT 20
    `;

    const moviesQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId"), 0) as local_views
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE (m."totalEpisodes" = 1 OR c.episode_count_actual = 1) AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY local_views DESC, m.popularity DESC NULLS LAST
        LIMIT 20
    `;

    const trendingQuery = sql`
        SELECT m."anilistId", 
               COALESCE(c.title_preferred, m."cleanTitle") as "cleanTitle", 
               m."nativeTitle", m."coverImage", m."bannerImage", m."score", m.popularity,
               (SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'score_local') as local_score,
               (SELECT MAX("episodeNumber") FROM episodes e WHERE e."anilistId" = m."anilistId") as "latestEpisode",
               COALESCE(c.episode_count_actual, m."totalEpisodes") as "totalEpisodes",
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0) as jikan_views,
               COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId" AND date >= CURRENT_DATE - INTERVAL '7 days'), 0) as local_trending
        FROM anime_metadata m
        LEFT JOIN canonical_anime c ON m."anilistId" = c.anilist_id
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY GREATEST(
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'views_local'), 0) + COALESCE((SELECT SUM(views) FROM daily_anime_stats d WHERE d."anilistId" = m."anilistId" AND date >= CURRENT_DATE - INTERVAL '7 days'), 0),
            COALESCE((SELECT MAX(raw_value::numeric) FROM metadata_sources ms WHERE ms.canonical_id = c.id AND ms.field_name = 'watching' AND ms.source_name = 'jikan_api'), 0)
        ) DESC, m.trending DESC NULLS LAST, m.popularity DESC NULLS LAST
        LIMIT 20
    `;

    // Execute concurrently
    const [
      heroRows,
      airingRows,
      latestRows,
      popularRows,
      completedRows,
      topRatedRows,
      isekaiRows,
      moviesRows,
      trendingRows,
    ] = await Promise.all([
      heroQuery,
      airingQuery,
      latestQuery,
      popularQuery,
      completedQuery,
      topRatedQuery,
      isekaiQuery,
      moviesQuery,
      trendingQuery,
    ]);

    const formatAnime = (d: any) => {
      let nextAiringEpisode = d.nextAiringEpisode;
      if (typeof nextAiringEpisode === 'string') {
        try {
          nextAiringEpisode = JSON.parse(nextAiringEpisode);
        } catch (e) {}
      }

      let finalScore = d.score;
      if (d.local_score !== null && d.local_score !== undefined) {
        const val = parseFloat(d.local_score);
        finalScore = val <= 10 ? Math.floor(val * 10) : Math.floor(val);
      }

      const localV = Number(d.local_views || d.local_trending || 0);
      const jikanV = Number(d.jikan_views || 0);
      
      let popV = d.popularity;
      if (!popV) {
        popV = (Number(d.anilistId) % 900) + 100;
      }

      const epsV = Number(d.totalEpisodes || 12);
      const baseV = Math.floor(popV * epsV * 0.7);

      const finalViews = Math.max(localV, jikanV) + baseV;

      return {
        id: String(d.anilistId),
        title: d.cleanTitle || d.nativeTitle,
        img: d.coverImage,
        banner: d.bannerImage,
        score: finalScore,
        views: finalViews,
        synopsis: d.synopsis,
        nextAiringEpisode: nextAiringEpisode,
        url: `/anime/${d.anilistId}`,
        anilistId: d.anilistId,
        latestEpisode: d.latestEpisode,
        episodes: d.totalEpisodes,
      };
    };

    return NextResponse.json({
      success: true,
      data: {
        hero: heroRows.map(formatAnime),
        airing: airingRows.map(formatAnime),
        latest: latestRows.map(formatAnime),
        popular: popularRows.map(formatAnime),
        completed: completedRows.map(formatAnime),
        top_rated: topRatedRows.map(formatAnime),
        isekai: isekaiRows.map(formatAnime),
        movies: moviesRows.map(formatAnime),
        trending: trendingRows.map(formatAnime),
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });

  } catch (error: any) {
    console.error('[Home API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
