import csv
file_id = "BQACAgUAAyEGAATc0SFaAAJWVmns5JXSi-1blI6cp982dkOPgbHpAAIkKgACVBhpV66elKLvt-mJOwQ"
found = False
for file in ["db_swarm_vault.csv", "merged_swarm_backup.csv"]:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            for line in f:
                if file_id in line:
                    print(f"Found in {file}:", line.strip())
                    found = True
    except:
        pass
if not found:
    print("Not found in CSVs")
