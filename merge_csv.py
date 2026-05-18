import csv
import os

file1 = "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/Sent/swarm_vault_backup_2026-05-12.csv"
file2 = "/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/Sent/swarm_vault_backup (1).csv"
output_file = "/data/data/com.termux/files/home/workspace/anime-scraper-pro/merged_swarm_backup.csv"

def read_csv(filepath):
    data = {}
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ep = str(float(row['episodeNumber'])) if '.' in row['episodeNumber'] else str(float(row['episodeNumber']))
            key = f"{row['anilistId']}_{ep}"
            data[key] = row
    return data

d1 = read_csv(file1)
d2 = read_csv(file2)

# Merge data
merged_data = {}

# Start with d1
for key, row in d1.items():
    merged_data[key] = row

# Add or update from d2
for key, row in d2.items():
    if key in merged_data:
        # If exists in both, keep the one with the most recent updatedAt (simple string compare works for ISO 8601)
        if row['updatedAt'] > merged_data[key]['updatedAt']:
            merged_data[key] = row
    else:
        merged_data[key] = row

# Write to output file
fieldnames = ['id', 'anilistId', 'title', 'episodeNumber', 'providerId', 'episodeUrl', 'updatedAt']
with open(output_file, mode='w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for key in sorted(merged_data.keys()):
        writer.writerow(merged_data[key])

print(f"Merge successful! Total unique episodes: {len(merged_data)}")
print(f"File saved to: {output_file}")
