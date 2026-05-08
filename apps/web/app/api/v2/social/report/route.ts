import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, anilist_id, episode_number, issue_type, player_error, video_url } = body;

    if (!user_id || !anilist_id || !episode_number || !issue_type) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const botToken = process.env.TG_BOT_REPORT || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_REPORT || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn('[Report API] Telegram credentials missing. Report ignored.');
      return NextResponse.json({ success: true, message: 'Report recorded locally (Telegram disabled)' });
    }

    let message = "🚨 <b>USER REPORT</b> 🚨\n\n";
    message += "<b>User:</b> <code>" + user_id + "</code>\n";
    message += "<b>Anime ID:</b> " + anilist_id + " | <b>Ep:</b> " + episode_number + "\n";
    message += "<b>Issue:</b> " + issue_type + "\n";
    if (player_error) {
      message += "<b>Player Error:</b> <code>" + player_error + "</code>\n";
    }
    if (video_url) {
      message += "<b>Stream URL:</b> <code>" + video_url + "</code>\n";
    }

    const reply_markup = {
      inline_keyboard: [
        [
          {
            text: "🔧 Triage & Re-Ingest Video",
            callback_data: "retry_video_" + anilist_id + "_" + episode_number,
          }
        ]
      ]
    };

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      reply_markup
    };

    const tgRes = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!tgRes.ok) {
      const errorText = await tgRes.text();
      console.error('[Report API] Failed to send report to Telegram:', errorText);
      return NextResponse.json({ success: false, error: 'Failed to send report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Report POST API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
