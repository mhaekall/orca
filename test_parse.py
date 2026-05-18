sources = [{'provider': 'otakuplay', 'quality': 'Auto', 'url': 'https://rr1---sn-npoldnel.googlevideo.com/videoplayback?...', 'type': 'hls (direct)'}]
quality_order = ["720p", "1080p", "480p", "Auto", "360p", "Unknown"]
best_source = None
best_rank = 999

for s in sources:
    source_type = s.get("type", "").lower()
    source_url = s.get("url", "").lower()
    source_provider = s.get("provider", "").lower()
    
    is_googlevideo = "googlevideo.com" in source_url
    
    if not is_googlevideo and ("hls" in source_type or "m3u8" in source_url or "iframe" in source_type):
        continue
        
    if "pixeldrain" in source_url or "pixeldrain" in source_provider:
        continue
        
    if is_googlevideo or any(t in source_type for t in ["mp4", "direct"]):
        q = s.get("quality", "Unknown")
        rank = quality_order.index(q) if q in quality_order else 999
        if rank < best_rank:
            best_rank = rank
            best_source = s

print(best_source)
