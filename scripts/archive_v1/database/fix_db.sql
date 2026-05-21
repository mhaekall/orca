BEGIN;

-- Perbarui di tabel episodes
UPDATE episodes 
SET "episodeUrl" = REPLACE(
    REPLACE("episodeUrl", 'tg-proxy', 'tele-proxy'), 
    '.workers.dev/', 
    '.workers.dev/stream/bot7328759161:AAGhAbS5jy9HWt7qHJnPAZsuCIOmTyDtKw0/'
)
WHERE "episodeUrl" LIKE '%tg-proxy%' 
  AND "episodeUrl" NOT LIKE '%/stream/bot%';

-- Perbarui di tabel swarm_vault
UPDATE swarm_vault 
SET "episodeUrl" = REPLACE(
    REPLACE("episodeUrl", 'tg-proxy', 'tele-proxy'), 
    '.workers.dev/', 
    '.workers.dev/stream/bot7328759161:AAGhAbS5jy9HWt7qHJnPAZsuCIOmTyDtKw0/'
)
WHERE "episodeUrl" LIKE '%tg-proxy%' 
  AND "episodeUrl" NOT LIKE '%/stream/bot%';

COMMIT;
