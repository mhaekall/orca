import csv

file1 = "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/Sent/swarm_vault_backup_2026-05-12.csv"
file2 = "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/Sent/swarm_vault_backup (1).csv"

def read_csv(filepath):
    data = {}
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Create a composite key to compare actual content rather than DB IDs
            # episodeNumber might be float in one file ("20.0") and int in another ("20")
            ep = str(float(row['episodeNumber'])) if '.' in row['episodeNumber'] else str(float(row['episodeNumber']))
            key = f"{row['anilistId']}_{ep}"
            data[key] = row
    return data

d1 = read_csv(file1)
d2 = read_csv(file2)

print(f"File 1 (58K, 12 Mei) - Total episodes: {len(d1)}")
print(f"File 2 (36K, File (1)) - Total episodes: {len(d2)}")

# Find differences
in_d1_not_d2 = set(d1.keys()) - set(d2.keys())
in_d2_not_d1 = set(d2.keys()) - set(d1.keys())

print(f"\nEpisodes in File 1 (58K) but NOT in File 2 (36K): {len(in_d1_not_d2)}")
print(f"Episodes in File 2 (36K) but NOT in File 1 (58K): {len(in_d2_not_d1)}")

# Titles in File 1 missing from File 2
if in_d1_not_d2:
    missing_titles = {}
    for k in in_d1_not_d2:
        title = d1[k]['title']
        missing_titles[title] = missing_titles.get(title, 0) + 1
    print("\n[Rincian yang ADA di File 58K, tapi TIDAK ADA di File 36K]")
    # sort by count desc
    for t, c in sorted(missing_titles.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {t}: {c} episodes")

if in_d2_not_d1:
    missing_titles2 = {}
    for k in in_d2_not_d1:
        title = d2[k]['title']
        missing_titles2[title] = missing_titles2.get(title, 0) + 1
    print("\n[Rincian yang ADA di File 36K, tapi TIDAK ADA di File 58K]")
    for t, c in sorted(missing_titles2.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {t}: {c} episodes")

