#!/bin/bash

# 우리동네 CCTV 배포 스크립트
# 사용법: ./deploy.sh [SERVER_IP]

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 서버 정보
SSH_KEY="$HOME/.ssh/jvibeschool_org.pem"
SSH_USER="bitnami"
DEPLOY_PATH="/opt/bitnami/apache/htdocs/CCTV"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 서버 IP 확인
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  서버 IP가 제공되지 않았습니다.${NC}"
    echo "사용법: ./deploy.sh [SERVER_IP]"
    echo ""
    echo "예시: ./deploy.sh 123.45.67.89"
    exit 1
fi

SERVER_IP="$1"

echo -e "${GREEN}🚀 우리동네 CCTV 배포 시작${NC}"
echo "서버: ${SSH_USER}@${SERVER_IP}"
echo "경로: ${DEPLOY_PATH}"
echo ""

# SSH 키 확인
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: ${SSH_KEY}${NC}"
    exit 1
fi

# 프론트엔드 빌드
echo -e "${YELLOW}📦 프론트엔드 빌드 중...${NC}"
cd "${PROJECT_ROOT}/frontend"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 빌드 완료${NC}"
echo ""

# 프론트엔드 배포
echo -e "${YELLOW}📤 프론트엔드 파일 전송 중...${NC}"
scp -i "$SSH_KEY" -r "${PROJECT_ROOT}/frontend/dist/"* "${SSH_USER}@${SERVER_IP}:${DEPLOY_PATH}/"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 파일 전송 실패${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 프론트엔드 배포 완료${NC}"
echo ""

# 배포 완료
echo -e "${GREEN}🎉 배포가 완료되었습니다!${NC}"
echo ""
echo "서비스 URL:"
echo "  - 프론트엔드: https://jvibeschool.org/CCTV/"
echo "  - 백엔드 API: https://jvibeschool.org/CCTV/api/"
echo ""
echo "배포된 파일:"
echo "  - ${DEPLOY_PATH}/"
echo ""

