import csv

with open('merged_swarm_backup.csv', 'r') as f:
    reader = csv.reader(f)
    lines = list(reader)

with open('restore_missing.sql', 'w') as out:
    for row in lines:
        if len(row) >= 6:
            url = row[5]
            if 'tg-proxy-4' in url or 'tg-proxy-2' in url:
                anilistId = row[1]
                episodeNumber = row[3]
                providerId = row[4]
                out.write(f"""
INSERT INTO episodes ("anilistId", "episodeNumber", "providerId", "episodeUrl", "updatedAt")
VALUES ({anilistId}, {episodeNumber}, '{providerId}', '', NOW());
""")
