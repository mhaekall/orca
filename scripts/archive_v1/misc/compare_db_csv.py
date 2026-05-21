import csv

csv_file = "merged_swarm_backup.csv"
db_file = "db_swarm_vault.csv"

def read_csv(filepath):
    data = {}
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ep = str(float(row['episodeNumber'])) if '.' in row['episodeNumber'] else str(float(row['episodeNumber']))
            key = f"{row['anilistId']}_{ep}"
            data[key] = row
    return data

csv_data = read_csv(csv_file)
db_data = read_csv(db_file)

print(f"Total episodes in merged CSV backup: {len(csv_data)}")
print(f"Total episodes currently in Database: {len(db_data)}")

in_csv_not_db = set(csv_data.keys()) - set(db_data.keys())
in_db_not_csv = set(db_data.keys()) - set(csv_data.keys())

print(f"\nEpisodes in CSV backup but MISSING in DB: {len(in_csv_not_db)}")
print(f"Episodes in DB but not in CSV backup: {len(in_db_not_csv)}")

if in_csv_not_db:
    missing_titles = {}
    for k in in_csv_not_db:
        title = csv_data[k]['title']
        missing_titles[title] = missing_titles.get(title, 0) + 1
    print("\n[Rincian Episode yang ADA di Backup CSV, tapi HILANG dari Database (Perlu di-restore)]")
    for t, c in sorted(missing_titles.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {t}: {c} episodes")
        
if in_db_not_csv:
    missing_titles2 = {}
    for k in in_db_not_csv:
        title = db_data[k]['title']
        missing_titles2[title] = missing_titles2.get(title, 0) + 1
    print("\n[Rincian Episode yang ADA di Database, tapi tidak ada di Backup CSV (Aman)]")
    for t, c in sorted(missing_titles2.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {t}: {c} episodes")

