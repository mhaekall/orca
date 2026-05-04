#!/bin/bash
# AI PRODUCTIVITY HACKER: DIRECT DEPLOY WORKER SPACE
set -e

echo "🚀 Deploying to Hugging Face Space: anime-ingestion-worker..."
git push hf-worker master:main
echo "✅ Worker Space deployed! Check: https://huggingface.co/spaces/jonyyyyyyyu/anime-ingestion-worker"
