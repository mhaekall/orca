BEGIN;
UPDATE episodes e
SET "episodeUrl" = sv."episodeUrl", "updatedAt" = NOW()
FROM swarm_vault sv
WHERE e."anilistId" = sv."anilistId" 
  AND e."episodeNumber" = sv."episodeNumber" 
  AND e."providerId" = sv."providerId"
  AND e."episodeUrl" != sv."episodeUrl";

INSERT INTO episodes ("anilistId", "providerId", "episodeNumber", "episodeUrl", "updatedAt")
SELECT sv."anilistId", sv."providerId", sv."episodeNumber", sv."episodeUrl", NOW()
FROM swarm_vault sv
JOIN anime_metadata am ON am."anilistId" = sv."anilistId"
LEFT JOIN episodes e 
  ON e."anilistId" = sv."anilistId" 
  AND e."episodeNumber" = sv."episodeNumber" 
  AND e."providerId" = sv."providerId"
WHERE e.id IS NULL;
COMMIT;
