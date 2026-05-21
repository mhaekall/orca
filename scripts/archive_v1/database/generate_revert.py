import csv
import json

csv_file = "/data/data/com.termux/files/home/workspace/anime-scraper-pro/merged_swarm_backup.csv"
sql_file = "revert_db.sql"

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

with open(sql_file, "w", encoding="utf-8") as f:
    f.write("BEGIN;\n")
    for key, row in csv_data.items():
        anilistId = row['anilistId']
        episodeNumber = row['episodeNumber']
        episodeUrl = row['episodeUrl'].replace("'", "''")
        
        # Restore ONLY episodes table so the frontend sees the original tg-proxy URLs
        sql1 = f"""UPDATE episodes SET "episodeUrl" = '{episodeUrl}' WHERE "anilistId" = {anilistId} AND "episodeNumber" = {episodeNumber};\n"""
        f.write(sql1)
    f.write("COMMIT;\n")

print(f"Generated {sql_file}")
