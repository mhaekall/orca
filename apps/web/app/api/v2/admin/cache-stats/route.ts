import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return NextResponse.json({ success: false, error: 'Redis credentials not set' }, { status: 500 });
  }

  try {
    const res = await fetch(`${redisUrl}/DBSIZE`, {
      headers: {
        Authorization: `Bearer ${redisToken}`
      }
    });
    
    if (!res.ok) {
      throw new Error(`Upstash returned ${res.status}`);
    }

    const data = await res.json();
    const dbsize = data.result || 0;

    return NextResponse.json({
      success: true,
      l0_entries: dbsize,
      l0_max: 10000, // Upstash free tier limit logic roughly
      l2_pg_entries: 0,
      inflight_scrapes: 0,
      circuit_breakers: {
        "jikan_api": "healthy",
        "anilist_graphql": "healthy",
        "telegram_upload": "healthy"
      }
    });
  } catch (error: any) {
    console.error('[Admin Cache Stats API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
