#!/usr/bin/env bash
# er.mongsil.dev 배포: 이미지를 빌드하고 compose의 er-tools 서비스를 새 이미지로 다시 띄운다
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/Applications/OrbStack.app/Contents/MacOS/xbin:$PATH"

TAG="er-tools:$(date +%Y%m%d-%H%M)"
echo "==> 이미지 빌드 $TAG"
docker build -t "$TAG" -t er-tools:latest .

echo "==> 컨테이너 교체"
docker compose -f "$HOME/docker/compose.yaml" up -d er-tools

echo "==> 확인"
for _ in $(seq 1 20); do
  if curl -fs -o /dev/null http://127.0.0.1:8745/api/health; then
    echo "  준비됨"
    exit 0
  fi
  sleep 1
done
echo "  응답이 없습니다. docker logs er-tools로 확인해주세요." >&2
exit 1
