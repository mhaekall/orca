import requests

configs = {
    "Lama (.env)": {
        "url": "https://powerful-crow-69427.upstash.io",
        "token": "gQAAAAAAAQ8zAAIgcDIzNzIxOWVjNDZhMGE0MzU1ODQ0ZmNhOGE0Mzg1OTI3ZA"
    },
    "Baru (Global Context)": {
        "url": "https://close-sunfish-80475.upstash.io",
        "token": "gQAAAAAAATpbAAIncDI3MDZlZTliZDk0ODg0ZTZiOGNkNTIzZDZiZGZjNjJhYXAyODA0NzU"
    }
}

for name, conf in configs.items():
    print(f"Menguji Upstash {name}...")
    headers = {"Authorization": f"Bearer {conf['token']}"}
    
    # Test ping
    try:
        r_ping = requests.get(f"{conf['url']}/ping", headers=headers)
        print(f"  - PING: {r_ping.status_code} -> {r_ping.text.strip()}")
        
        # Get INFO
        r_info = requests.get(f"{conf['url']}/info", headers=headers)
        if r_info.status_code == 200:
            res = r_info.json().get("result", "")
            # Ekstrak beberapa info penting
            memory = [l for l in res.split("\n") if l.startswith("used_memory_human")]
            keys = [l for l in res.split("\n") if "keys=" in l]
            print(f"  - Memory Terpakai: {memory[0].split(':')[1] if memory else 'N/A'}")
            print(f"  - Database Keys  : {keys[0].split(':')[1] if keys else 'N/A'}")
        else:
            print(f"  - INFO Failed: {r_info.status_code} -> {r_info.text.strip()}")
            
    except Exception as e:
        print(f"  - Error: {e}")
    print("-" * 40)
