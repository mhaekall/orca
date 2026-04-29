import os
import sys
import asyncio
import httpx
import logging
from typing import Optional

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv

load_dotenv()

from db.connection import database
from services.ingestion.main import IngestionEngine
from services.stream_cache import get_cached_stream

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Menggunakan token bot yang ada di .env (Orca 4)
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

if not BOT_TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN tidak ditemukan di .env!")
    sys.exit(1)

async def send_message(client, chat_id, text, reply_markup=None, message_id=None):
    try:
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
            
        if message_id:
            payload["message_id"] = message_id
            await client.post(f"{API_URL}/editMessageText", json=payload)
        else:
            res = await client.post(f"{API_URL}/sendMessage", json=payload)
            return res.json().get("result", {}).get("message_id")
    except Exception as e:
        logger.error(f"Failed to send message: {e}")

async def answer_callback(client, callback_query_id, text=""):
    try:
        await client.post(f"{API_URL}/answerCallbackQuery", json={
            "callback_query_id": callback_query_id,
            "text": text
        })
    except:
        pass

async def handle_check(client, chat_id, args):
    if len(args) == 0:
        status_msg = await send_message(client, chat_id, "🔍 Memuat daftar anime yang memiliki episode pending...")
        try:
            if not database.is_connected:
                await database.connect()
            query = """
                SELECT DISTINCT m."anilistId", m."cleanTitle", m.popularity
                FROM episodes e
                JOIN anime_metadata m ON e."anilistId" = m."anilistId"
                WHERE e."episodeUrl" NOT LIKE '%tele-proxy%' 
                  AND e."episodeUrl" NOT LIKE '%tg-proxy%' 
                  AND e."episodeUrl" NOT LIKE '%workers.dev%'
                  AND e."episodeUrl" IS NOT NULL AND e."episodeUrl" != ''
                ORDER BY m.popularity DESC NULLS LAST
                LIMIT 15
            """
            rows = await database.fetch_all(query)
            if not rows:
                await send_message(client, chat_id, "🎉 Hebat! Tidak ada anime dengan episode pending saat ini!", message_id=status_msg)
                return
            
            msg = "📚 <b>Top 15 Anime Pending Ingestion</b>\nPilih salah satu untuk mengecek detailnya:"
            keyboard = []
            for r in rows:
                title = r["cleanTitle"]
                if len(title) > 35:
                    title = title[:35] + "..."
                keyboard.append([{"text": f"📺 {title}", "callback_data": f"check:{r['anilistId']}"}])
            
            await send_message(client, chat_id, msg, reply_markup={"inline_keyboard": keyboard}, message_id=status_msg)
        except Exception as e:
            await send_message(client, chat_id, f"💥 Error Database: {e}", message_id=status_msg)
        return

    if len(args) != 1:
        await send_message(client, chat_id, "❌ Format salah. Gunakan: <code>/check</code> atau <code>/check &lt;anilist_id&gt;</code>")
        return
        
    anilist_id = args[0]
    if not str(anilist_id).isdigit():
        await send_message(client, chat_id, "❌ anilist_id harus berupa angka.")
        return
        
    anilist_id = int(anilist_id)
    status_msg = await send_message(client, chat_id, f"🔍 Memeriksa database untuk Anime ID: <b>{anilist_id}</b>...")
    
    try:
        if not database.is_connected:
            await database.connect()
            
        query = """
            SELECT "episodeNumber", "episodeUrl", "providerId"
            FROM episodes
            WHERE "anilistId" = :aid
            ORDER BY "episodeNumber" ASC
        """
        rows = await database.fetch_all(query, values={"aid": anilist_id})
        
        if not rows:
            await send_message(client, chat_id, f"⚠️ Anime ID {anilist_id} tidak ditemukan di database (Belum di-sync).", message_id=status_msg)
            return
            
        # Get clean title
        title_row = await database.fetch_one('SELECT "cleanTitle" FROM anime_metadata WHERE "anilistId" = :aid', values={"aid": anilist_id})
        title = title_row["cleanTitle"] if title_row else f"Anime {anilist_id}"
        
        msg = f"📊 <b>Status: {title}</b>\n\n"
        pending_eps = []
        for r in rows:
            ep = r["episodeNumber"]
            url = r["episodeUrl"]
            prov = r["providerId"]
            if url and ("tele-proxy" in url or "tg-proxy" in url or "workers.dev" in url):
                msg += f"✅ Ep {ep} - Sukses\n"
            else:
                msg += f"❌ Ep {ep} - Pending ({prov})\n"
                pending_eps.append(ep)
                
        reply_markup = None
        if pending_eps:
            msg += f"\nAda <b>{len(pending_eps)} episode pending</b>."
            keyboard = []
            # Add Auto button
            keyboard.append([{"text": f"🚀 AUTO INGEST SEMUA ({len(pending_eps)} Eps)", "callback_data": f"auto:{anilist_id}"}])
            
            # Add individual buttons (max 12 for safety in UI)
            row = []
            for ep in pending_eps[:12]:
                row.append({"text": f"Ep {ep}", "callback_data": f"ingest:{anilist_id}:{ep}"})
                if len(row) == 3:
                    keyboard.append(row)
                    row = []
            if row:
                keyboard.append(row)
                
            reply_markup = {"inline_keyboard": keyboard}
        else:
            msg += "\n🎉 Semua episode sudah sukses di-ingest!"
            
        await send_message(client, chat_id, msg, reply_markup=reply_markup, message_id=status_msg)
            
    except Exception as e:
        await send_message(client, chat_id, f"💥 Error Database: {e}", message_id=status_msg)

async def do_ingest(client, chat_id, anilist_id, ep_num, auto_mode=False):
    status_msg_id = None
    if not auto_mode:
        status_msg_id = await send_message(client, chat_id, f"⏳ [Ep {ep_num}] Memancing tautan mentah ke Cache...")
    
    try:
        if not database.is_connected:
            await database.connect()
            
        query = """
            SELECT e.id, e."providerId", e."episodeUrl", m."cleanTitle"
            FROM episodes e
            JOIN anime_metadata m ON e."anilistId" = m."anilistId"
            WHERE e."anilistId" = :aid AND e."episodeNumber" = :ep
            LIMIT 1
        """
        row = await database.fetch_one(query, values={"aid": anilist_id, "ep": ep_num})
        
        if not row:
            if not auto_mode: await send_message(client, chat_id, f"⚠️ Episode {ep_num} tidak ditemukan di database.", message_id=status_msg_id)
            return False
            
        provider_id = row["providerId"]
        
        # Check if already ingested
        ep_url = row["episodeUrl"]
        if ep_url and ("tele-proxy" in ep_url or "workers.dev" in ep_url):
            if not auto_mode: await send_message(client, chat_id, f"✅ [Ep {ep_num}] Sudah berstatus sukses (Bypass).", message_id=status_msg_id)
            return True
        
        # Scrape and Cache
        res = await get_cached_stream(anilist_id, ep_num)
        
        direct_url = ""
        quality_picked = "Auto"
        
        if res and "sources" in res:
            for s in res.get("sources", []):
                if s.get("quality") == "720p" and any(t in s.get("type", "") for t in ["mp4", "direct", "hls"]):
                    direct_url = s.get("raw_url") or s.get("url", "")
                    quality_picked = "720p"
                    break
            
            if not direct_url:
                for s in res.get("sources", []):
                    if any(t in s.get("type", "") for t in ["mp4", "direct", "hls"]):
                        direct_url = s.get("raw_url") or s.get("url", "")
                        quality_picked = s.get("quality", "Auto")
                        break
                        
            if not direct_url and len(res.get("sources", [])) > 0:
                direct_url = res["sources"][0].get("raw_url") or res["sources"][0].get("url", "")
                quality_picked = res["sources"][0].get("quality", "Auto")
                
        if not direct_url:
            if not auto_mode: await send_message(client, chat_id, f"❌ [Ep {ep_num}] Gagal memancing URL dari sumber.", message_id=status_msg_id)
            return False
            
        if not auto_mode: await send_message(client, chat_id, f"✅ [Ep {ep_num}] Tautan {quality_picked} diamankan ke Cache!\n🚀 Membangunkan GitHub Actions...", message_id=status_msg_id)
        # Beri waktu sebentar agar Redis L2 selesai menulis
        await asyncio.sleep(2)
        os.system(f"gh workflow run ingest-cron.yml -f anilist_id={anilist_id} -f ep_num={ep_num}")
        await send_message(client, chat_id, f"🎉 <b>GITHUB ACTIONS TRIGGERED!</b>\n\nMesin Cloud sedang mengambil alih tugas kasar untuk Ep {ep_num}. Anda bisa memantaunya di GitHub atau menunggu file M3U8 masuk grup.")
            
        return True
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        if not auto_mode: await send_message(client, chat_id, f"💥 Error Ingestion [Ep {ep_num}]: {e}", message_id=status_msg_id)
        return False

async def handle_auto(client, chat_id, args):
    if len(args) != 1:
        await send_message(client, chat_id, "❌ Format salah. Gunakan: <code>/auto &lt;anilist_id&gt;</code>")
        return
        
    anilist_id = args[0]
    if not anilist_id.isdigit():
        return
    anilist_id = int(anilist_id)
    
    status_msg = await send_message(client, chat_id, f"🤖 <b>AUTO INGEST DIMULAI</b>\nAnime: {anilist_id}\nMendata episode pending...")
    
    try:
        if not database.is_connected:
            await database.connect()
            
        query = """
            SELECT "episodeNumber", "episodeUrl"
            FROM episodes
            WHERE "anilistId" = :aid
            ORDER BY "episodeNumber" ASC
        """
        rows = await database.fetch_all(query, values={"aid": anilist_id})
        
        pending = []
        for r in rows:
            url = r["episodeUrl"]
            if not url or ("tele-proxy" not in url and "tg-proxy" not in url and "workers.dev" not in url):
                pending.append(r["episodeNumber"])
                
        if not pending:
            await send_message(client, chat_id, "✅ Tidak ada episode pending untuk di-ingest.", message_id=status_msg)
            return
            
        await send_message(client, chat_id, f"🎣 Memancing {len(pending)} episode ke dalam Cache...", message_id=status_msg)
        
        success_count = 0
        for ep in pending:
            ok = await do_ingest(client, chat_id, anilist_id, ep, auto_mode=True)
            if ok:
                success_count += 1
            await asyncio.sleep(2) # Jeda antar episode
            
        # Beri jeda 3 detik memastikan seluruh L2 Cache Redis tertulis utuh
        await asyncio.sleep(3)
        
        # Trigger GitHub Actions ONCE for all (Bulk Mode, no specific args)
        os.system("gh workflow run ingest-cron.yml")
        
        await send_message(client, chat_id, f"✅ <b>AUTO PANCING SELESAI!</b>\nBerhasil mengamankan <b>{success_count}/{len(pending)}</b> tautan mentah ke Cache.\n\n🚀 <b>GITHUB ACTIONS TELAH DIBANGUNKAN!</b>\nSemua episode tersebut sekarang sedang dikerjakan borongan oleh server Cloud. Silakan istirahat!", message_id=status_msg)
        
    except Exception as e:
        await send_message(client, chat_id, f"💥 Error Auto Ingest: {e}")

async def main():
    logger.info("Memulai Telegram Ingestion Bot...")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        res_hook = await client.get(f"{API_URL}/deleteWebhook")
        logger.info(f"Delete Webhook: {res_hook.text}")
        
        logger.info("Memulai long polling, tunggu pesan masuk...")
        
        offset = 0
        while True:
            try:
                res = await client.get(f"{API_URL}/getUpdates", params={"offset": offset, "timeout": 30})
                if res.status_code == 200:
                    data = res.json()
                    for update in data.get("result", []):
                        offset = update["update_id"] + 1
                        
                        # Handle Callback Query (Button Clicks)
                        if "callback_query" in update:
                            cb = update["callback_query"]
                            cb_id = cb["id"]
                            chat_id = cb["message"]["chat"]["id"]
                            data_str = cb["data"]
                            
                            await answer_callback(client, cb_id, "Memproses...")
                            
                            if data_str.startswith("ingest:"):
                                parts = data_str.split(":")
                                if len(parts) == 3:
                                    aid = int(parts[1])
                                    ep = float(parts[2])
                                    asyncio.create_task(do_ingest(client, chat_id, aid, ep))
                            elif data_str.startswith("auto:"):
                                parts = data_str.split(":")
                                if len(parts) == 2:
                                    aid = parts[1]
                                    asyncio.create_task(handle_auto(client, chat_id, [aid]))
                            elif data_str.startswith("check:"):
                                parts = data_str.split(":")
                                if len(parts) == 2:
                                    aid = parts[1]
                                    asyncio.create_task(handle_check(client, chat_id, [aid]))
                            continue
                        
                        # Handle Text Messages
                        if "message" in update and "text" in update["message"]:
                            msg = update["message"]
                            chat_id = msg["chat"]["id"]
                            text = msg["text"].strip()
                            
                            logger.info(f"Pesan dari {chat_id}: {text}")
                            
                            if text.startswith("/check"):
                                args = text.split()[1:]
                                asyncio.create_task(handle_check(client, chat_id, args))
                            elif text.startswith("/ingest"):
                                args = text.split()[1:]
                                if len(args) == 2:
                                    asyncio.create_task(do_ingest(client, chat_id, int(args[0]), float(args[1])))
                                else:
                                    await send_message(client, chat_id, "❌ Format salah. Gunakan: <code>/ingest &lt;anilist_id&gt; &lt;episode&gt;</code>")
                            elif text.startswith("/auto"):
                                args = text.split()[1:]
                                asyncio.create_task(handle_auto(client, chat_id, args))
                            elif text == "/start":
                                await send_message(client, chat_id, "👋 Halo Bos! Saya adalah <b>Orca Ingestion Bot</b>.\n\n"
                                                                    "Gunakan perintah berikut:\n"
                                                                    "1️⃣ <code>/check &lt;anilist_id&gt;</code> (Mengecek status dan memunculkan tombol klik otomatis)\n"
                                                                    "2️⃣ <code>/auto &lt;anilist_id&gt;</code> (Otomatis membabat habis semua episode pending)\n"
                                                                    "3️⃣ <code>/ingest &lt;anilist_id&gt; &lt;eps&gt;</code> (Ingest manual 1 eps)")
                else:
                    logger.error(f"Telegram API Error: {res.status_code} - {res.text}")
                    await asyncio.sleep(5)
            except httpx.ReadTimeout:
                pass 
            except Exception as e:
                logger.error(f"Polling error: {e}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot dihentikan.")