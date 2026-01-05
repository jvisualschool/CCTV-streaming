# 🚀 CCTV 실시간 웹앱 개발 가이드
## Google Antigravity 바이브코딩 전용

---

## 📋 프로젝트 개요

**프로젝트명**: RoadEye (로드아이)  
**목표**: 전국 교통 CCTV 실시간 스트리밍 웹 애플리케이션  
**개발 방식**: Google Antigravity AI Agent 주도 개발  
**배포 환경**: AWS Lightsail LAMP (jvibeschool.com/jvibeschool.org)

---

## 🎯 Phase 1: Antigravity 프로젝트 초기화

### 1단계: 프로젝트 생성 프롬프트

```markdown
# Antigravity에게 전달할 첫 번째 프롬프트

당신은 시니어 풀스택 개발자입니다. 
다음 스펙으로 "RoadEye" 프로젝트를 생성하세요:

## 프로젝트 목표
- 대한민국 교통 CCTV 실시간 스트리밍 웹앱
- 사용자 위치 기반 주변 CCTV 자동 검색
- 지도 인터페이스로 CCTV 선택 및 재생

## 기술 스택
**Frontend:**
- React 18 + TypeScript
- Vite (빌드 도구)
- Tailwind CSS (스타일링)
- Kakao Map API (지도)
- Video.js (비디오 플레이어)

**Backend:**
- Python FastAPI
- Uvicorn (ASGI 서버)
- httpx (비동기 HTTP 클라이언트)
- Redis (캐싱)

**스트리밍:**
- FFmpeg (RTSP → HLS 변환)
- HLS.js (브라우저 재생)

## 프로젝트 구조
```
roadeye/
├── frontend/          # React 앱
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── App.tsx
│   └── package.json
├── backend/           # FastAPI 서버
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   └── main.py
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

## 첫 작업
1. 기본 프로젝트 구조 생성
2. package.json, requirements.txt 설정
3. Docker Compose 설정 (Redis 포함)
4. 기본 FastAPI 서버 (헬스체크 엔드포인트)
5. React 기본 페이지 (Hello World)
```

---

## 🎯 Phase 2: 공공 API 연동

### 2단계: API 통합 프롬프트

```markdown
# Antigravity 프롬프트 - API 연동

## 작업 목표
ITS 국가교통정보센터 CCTV API를 연동하세요.

## API 스펙
**Base URL**: https://openapi.its.go.kr:9443/cctvInfo
**인증 방식**: Query Parameter (apiKey)
**응답 형식**: XML → JSON 변환 필요

## 필요한 API 엔드포인트
1. `GET /getCCTVInfo` - CCTV 목록 조회
   - Parameters: type=all, cctvType=1, minX, maxX, minY, maxY, apiKey
   
2. `GET /getCCTVStream` - CCTV 스트림 URL 조회
   - Parameters: cctvid, apiKey

## 구현 요구사항

### Backend (FastAPI)
```python
# app/services/its_api.py 생성

class ITSAPIService:
    """ITS 국가교통정보센터 API 클라이언트"""
    
    def __init__(self):
        self.base_url = "https://openapi.its.go.kr:9443"
        self.api_key = os.getenv("ITS_API_KEY")
    
    async def get_cctv_list(self, bounds: dict) -> List[CCTVInfo]:
        """좌표 범위 내 CCTV 목록 조회"""
        pass
    
    async def get_cctv_stream(self, cctv_id: str) -> str:
        """CCTV 스트림 URL 조회"""
        pass

# app/api/cctv.py 생성
@router.get("/api/cctv/list")
async def get_nearby_cctv(
    lat: float,
    lng: float,
    radius: float = 5.0
):
    """사용자 위치 기반 CCTV 목록"""
    pass

@router.get("/api/cctv/{cctv_id}/stream")
async def get_cctv_stream(cctv_id: str):
    """CCTV 스트림 URL 반환"""
    pass
```

### 환경 변수 설정
```env
# .env 파일 생성
ITS_API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379
KAKAO_MAP_KEY=your_kakao_key_here
```

### 테스트
- Postman/HTTPie로 API 엔드포인트 테스트
- 응답 데이터 구조 확인
- 에러 핸들링 확인

### API 키 발급 방법
1. ITS 국가교통정보센터 접속: https://www.its.go.kr
2. 회원가입 및 로그인
3. 개방데이터 > API 신청
4. 활용 목적 작성 (교육/연구용)
5. 승인 후 API 키 발급 (보통 1-2일 소요)
```

---

## 🎯 Phase 3: 지도 인터페이스

### 3단계: Kakao Map 통합 프롬프트

```markdown
# Antigravity 프롬프트 - 지도 UI

## 작업 목표
Kakao Map API를 사용하여 CCTV 위치 시각화

## 구현 요구사항

### 1. Kakao Map SDK 설치
```bash
npm install react-kakao-maps-sdk
```

### 2. MapContainer 컴포넌트 생성
```typescript
// src/components/MapContainer.tsx

interface CCTVMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'active' | 'inactive';
}

export const MapContainer = () => {
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 }); // 서울시청
  const [markers, setMarkers] = useState<CCTVMarker[]>([]);
  const [selectedCCTV, setSelectedCCTV] = useState<string | null>(null);
  
  // 지도 이동 시 CCTV 목록 갱신
  const handleMapBoundsChanged = async (map: kakao.maps.Map) => {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    const cctvList = await fetchCCTVList({
      minX: sw.getLng(),
      maxX: ne.getLng(),
      minY: sw.getLat(),
      maxY: ne.getLat()
    });
    
    setMarkers(cctvList);
  };
  
  return (
    <Map
      center={center}
      style={{ width: '100%', height: '100vh' }}
      level={3}
      onBoundsChanged={handleMapBoundsChanged}
    >
      {markers.map(marker => (
        <MapMarker
          key={marker.id}
          position={{ lat: marker.lat, lng: marker.lng }}
          onClick={() => setSelectedCCTV(marker.id)}
          image={{
            src: marker.status === 'active' 
              ? '/icons/cctv-active.png' 
              : '/icons/cctv-inactive.png',
            size: { width: 32, height: 32 }
          }}
        />
      ))}
    </Map>
  );
};
```

### 3. 기능 요구사항
- ✅ 사용자 현재 위치로 자동 이동 (Geolocation API)
- ✅ CCTV 마커 클릭 시 정보창 표시
- ✅ 지도 드래그/줌 시 CCTV 목록 실시간 갱신
- ✅ 클러스터링 (마커 많을 때 그룹화)
- ✅ 검색 기능 (주소/지명 검색)

### 4. 스타일링
- Tailwind CSS로 모던한 UI
- 다크모드 지원
- 반응형 레이아웃 (모바일 최적화)

### 5. UX 개선사항
- 로딩 스피너 표시
- 에러 발생 시 토스트 알림
- CCTV 상태 표시 (활성/비활성)
- 즐겨찾기 기능 (LocalStorage)

### Kakao Map API 키 발급
1. Kakao Developers 접속: https://developers.kakao.com
2. 애플리케이션 추가
3. 앱 설정 > 플랫폼 > Web 플랫폼 등록
4. 사이트 도메인 등록 (localhost:3000, jvibeschool.com)
5. JavaScript 키 발급
```

---

## 🎯 Phase 4: 비디오 스트리밍

### 4단계: RTSP → HLS 변환 프롬프트

```markdown
# Antigravity 프롬프트 - 스트리밍 서버

## 작업 목표
RTSP 스트림을 HLS로 변환하여 웹 브라우저에서 재생

## 아키텍처
```
[CCTV RTSP Stream] 
    ↓
[FFmpeg Transcoding] 
    ↓
[HLS Segments (.m3u8 + .ts)]
    ↓
[Redis Cache]
    ↓
[Browser HLS.js Player]
```

## Backend 구현

### 1. FFmpeg 래퍼 서비스
```python
# app/services/streaming.py

import asyncio
import subprocess
from pathlib import Path
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class StreamingService:
    def __init__(self):
        self.output_dir = Path("/tmp/hls")
        self.output_dir.mkdir(exist_ok=True)
        self.active_streams: Dict[str, asyncio.subprocess.Process] = {}
        self.max_streams = 10  # 동시 스트림 제한
    
    async def start_stream(self, cctv_id: str, rtsp_url: str) -> str:
        """RTSP → HLS 변환 시작"""
        
        if len(self.active_streams) >= self.max_streams:
            raise Exception("최대 동시 스트림 수 초과")
        
        output_path = self.output_dir / f"{cctv_id}"
        output_path.mkdir(exist_ok=True)
        
        playlist_file = output_path / "playlist.m3u8"
        
        ffmpeg_cmd = [
            "ffmpeg",
            "-rtsp_transport", "tcp",
            "-i", rtsp_url,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "44100",
            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "5",
            "-hls_flags", "delete_segments+omit_endlist",
            "-hls_segment_filename", str(output_path / "segment_%03d.ts"),
            str(playlist_file)
        ]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.active_streams[cctv_id] = process
            logger.info(f"스트리밍 시작: {cctv_id}")
            
            return f"/stream/{cctv_id}/playlist.m3u8"
            
        except Exception as e:
            logger.error(f"스트리밍 시작 실패: {e}")
            raise
    
    async def stop_stream(self, cctv_id: str):
        """스트리밍 중단"""
        if cctv_id in self.active_streams:
            process = self.active_streams[cctv_id]
            process.terminate()
            await process.wait()
            del self.active_streams[cctv_id]
            logger.info(f"스트리밍 중단: {cctv_id}")
    
    async def cleanup_inactive_streams(self):
        """비활성 스트림 정리 (5분 타임아웃)"""
        # 구현: 마지막 접근 시간 추적 및 타임아웃 처리
        pass
```

### 2. 스트리밍 엔드포인트
```python
# app/api/streaming.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter()

@router.post("/api/stream/start/{cctv_id}")
async def start_streaming(cctv_id: str):
    """CCTV 스트리밍 시작"""
    try:
        rtsp_url = await its_service.get_cctv_stream(cctv_id)
        hls_url = await streaming_service.start_stream(cctv_id, rtsp_url)
        return {"hls_url": hls_url, "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/stream/stop/{cctv_id}")
async def stop_streaming(cctv_id: str):
    """CCTV 스트리밍 중단"""
    await streaming_service.stop_stream(cctv_id)
    return {"status": "stopped"}

@router.get("/stream/{cctv_id}/{file_name}")
async def serve_hls_file(cctv_id: str, file_name: str):
    """HLS 파일 제공 (.m3u8, .ts)"""
    file_path = Path(f"/tmp/hls/{cctv_id}/{file_name}")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # MIME 타입 설정
    if file_name.endswith('.m3u8'):
        media_type = "application/vnd.apple.mpegurl"
    elif file_name.endswith('.ts'):
        media_type = "video/mp2t"
    else:
        media_type = "application/octet-stream"
    
    return FileResponse(
        file_path, 
        media_type=media_type,
        headers={
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*"
        }
    )
```

## Frontend 구현

### 3. Video.js 플레이어 컴포넌트
```typescript
// src/components/CCTVPlayer.tsx

import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface CCTVPlayerProps {
  cctvId: string;
  cctvName: string;
  onClose: () => void;
}

export const CCTVPlayer = ({ cctvId, cctvName, onClose }: CCTVPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const initPlayer = async () => {
      try {
        // 스트리밍 시작
        const response = await fetch(`/api/stream/start/${cctvId}`, {
          method: 'POST'
        });
        const data = await response.json();
        
        if (videoRef.current) {
          playerRef.current = videojs(videoRef.current, {
            autoplay: true,
            controls: true,
            responsive: true,
            fluid: true,
            preload: 'auto',
            sources: [{
              src: data.hls_url,
              type: 'application/x-mpegURL'
            }]
          });
          
          playerRef.current.on('loadeddata', () => {
            setIsLoading(false);
          });
          
          playerRef.current.on('error', () => {
            setError('스트리밍 로드 실패');
            setIsLoading(false);
          });
        }
      } catch (err) {
        setError('스트리밍 시작 실패');
        setIsLoading(false);
      }
    };
    
    initPlayer();
    
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
      // 스트리밍 중단
      fetch(`/api/stream/stop/${cctvId}`, { method: 'POST' });
    };
  }, [cctvId]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{cctvName}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="video-container relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          )}
          
          {error && (
            <div className="text-red-500 text-center p-4">
              {error}
            </div>
          )}
          
          <video 
            ref={videoRef} 
            className="video-js vjs-default-skin vjs-big-play-centered"
            style={{ width: '100%', height: '500px' }}
          />
        </div>
      </div>
    </div>
  );
};
```

## 성능 최적화
- Redis로 HLS 세그먼트 캐싱 (TTL 10초)
- 동시 스트림 제한 (서버 부하 방지)
- 비활성 스트림 자동 종료 (5분 타임아웃)
- CDN 활용 (CloudFront 또는 Cloudflare)
- 적응형 비트레이트 스트리밍 (여러 품질 옵션)

## 주의사항
- FFmpeg 설치 필요: `apt-get install ffmpeg`
- 충분한 대역폭 확보 (스트림당 2-5 Mbps)
- 디스크 공간 모니터링 (HLS 세그먼트 자동 삭제)
```

---

## 🎯 Phase 5: AWS Lightsail 배포

### 5단계: 배포 자동화 프롬프트

```markdown
# Antigravity 프롬프트 - 배포 설정

## 작업 목표
AWS Lightsail LAMP 환경에 배포

## 배포 스크립트 생성

### 1. Docker Compose 프로덕션 설정
```yaml
# docker-compose.prod.yml

version: '3.8'

services:
  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=https://jvibeschool.com/api
      - VITE_KAKAO_MAP_KEY=${KAKAO_MAP_KEY}
    restart: unless-stopped
    networks:
      - roadeye-network
  
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - ITS_API_KEY=${ITS_API_KEY}
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=INFO
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - roadeye-network
    volumes:
      - /tmp/hls:/tmp/hls
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - roadeye-network
    command: redis-server --appendonly yes

volumes:
  redis_data:

networks:
  roadeye-network:
    driver: bridge
```

### 2. Frontend Dockerfile
```dockerfile
# frontend/Dockerfile.prod

FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Backend Dockerfile
```dockerfile
# backend/Dockerfile.prod

FROM python:3.11-slim

# FFmpeg 설치
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 4. 배포 스크립트
```bash
#!/bin/bash
# deploy.sh

set -e  # 에러 발생 시 중단

echo "🚀 RoadEye 배포 시작..."

# 1. Git Pull
echo "📥 최신 코드 가져오기..."
git pull origin main

# 2. 환경 변수 로드
if [ -f .env.production ]; then
    source .env.production
else
    echo "❌ .env.production 파일이 없습니다!"
    exit 1
fi

# 3. Docker 이미지 빌드
echo "🔨 Docker 이미지 빌드 중..."
docker-compose -f docker-compose.prod.yml build

# 4. 기존 컨테이너 중단
echo "🛑 기존 컨테이너 중단 중..."
docker-compose -f docker-compose.prod.yml down

# 5. 새 컨테이너 시작
echo "▶️  새 컨테이너 시작 중..."
docker-compose -f docker-compose.prod.yml up -d

# 6. 헬스체크
echo "🏥 헬스체크 수행 중..."
sleep 10

if curl -f http://localhost:8000/health; then
    echo "✅ 배포 완료!"
else
    echo "❌ 헬스체크 실패! 롤백 중..."
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# 7. 로그 확인
echo "📋 최근 로그:"
docker-compose -f docker-compose.prod.yml logs --tail=50
```

### 5. Nginx 리버스 프록시 설정
```nginx
# /etc/nginx/sites-available/roadeye

upstream frontend {
    server localhost:3000;
}

upstream backend {
    server localhost:8000;
}

server {
    listen 80;
    server_name jvibeschool.com www.jvibeschool.com;
    
    # SSL 리다이렉트 (Let's Encrypt 설정 후)
    # return 301 https://$server_name$request_uri;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS 설정
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
    }
    
    # HLS 스트리밍
    location /stream {
        proxy_pass http://backend;
        
        # HLS 최적화
        add_header Cache-Control "no-cache";
        add_header Access-Control-Allow-Origin "*";
        
        types {
            application/vnd.apple.mpegurl m3u8;
            video/mp2t ts;
        }
        
        # 버퍼링 최소화
        proxy_buffering off;
        proxy_cache off;
    }
}

# HTTPS 설정 (Let's Encrypt 인증서 발급 후)
# server {
#     listen 443 ssl http2;
#     server_name jvibeschool.com www.jvibeschool.com;
#     
#     ssl_certificate /etc/letsencrypt/live/jvibeschool.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/jvibeschool.com/privkey.pem;
#     
#     # 위 location 블록들 동일하게 적용
# }
```

### 6. 모니터링 스크립트
```bash
#!/bin/bash
# health_check.sh

LOG_FILE="/var/log/roadeye_health.log"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "[$TIMESTAMP] ❌ 서버 다운 감지! 재시작 중..." | tee -a $LOG_FILE
        
        cd /home/bitnami/roadeye
        docker-compose -f docker-compose.prod.yml restart
        
        sleep 30
        
        if curl -f http://localhost:8000/health > /dev/null 2>&1; then
            echo "[$TIMESTAMP] ✅ 서버 재시작 성공" | tee -a $LOG_FILE
        else
            echo "[$TIMESTAMP] ❌ 서버 재시작 실패" | tee -a $LOG_FILE
            # 이메일 알림 또는 Slack 알림 추가 가능
        fi
    else
        echo "[$TIMESTAMP] ✅ 정상 동작 중" >> $LOG_FILE
    fi
    
    sleep 60
done
```

### 7. 시스템 서비스 등록
```bash
# /etc/systemd/system/roadeye-health.service

[Unit]
Description=RoadEye Health Check Service
After=network.target

[Service]
Type=simple
User=bitnami
WorkingDirectory=/home/bitnami/roadeye
ExecStart=/home/bitnami/roadeye/health_check.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

### 8. SSL 인증서 자동 갱신
```bash
#!/bin/bash
# setup_ssl.sh

# Let's Encrypt 설치
sudo apt-get install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d jvibeschool.com -d www.jvibeschool.com

# 자동 갱신 설정 (crontab)
# 0 0 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

## 배포 체크리스트
- [ ] AWS Lightsail 인스턴스 생성 (최소 2GB RAM)
- [ ] Docker 및 Docker Compose 설치
- [ ] ITS API 키 발급 및 설정
- [ ] Kakao Map API 키 발급
- [ ] 환경 변수 파일 (.env.production) 생성
- [ ] Nginx 설치 및 설정
- [ ] SSL 인증서 설정 (Let's Encrypt)
- [ ] 방화벽 규칙 설정 (포트 80, 443, 8000)
- [ ] 로그 로테이션 설정
- [ ] 헬스체크 서비스 등록
- [ ] 백업 스크립트 설정
- [ ] 도메인 DNS 설정 (jvibeschool.com → Lightsail IP)

## AWS Lightsail 초기 설정
```bash
# SSH 접속
ssh -i lightsail_key.pem bitnami@your-lightsail-ip

# 시스템 업데이트
sudo apt-get update && sudo apt-get upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker bitnami

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 프로젝트 클론
cd /home/bitnami
git clone https://github.com/jvisualschool/roadeye.git
cd roadeye

# 배포 스크립트 실행 권한
chmod +x deploy.sh health_check.sh

# 첫 배포
./deploy.sh
```
```

---

## 🎯 Phase 6: 고급 기능 (선택)

### 6단계: AI 기능 추가 프롬프트

```markdown
# Antigravity 프롬프트 - AI 기능 (선택 사항)

## 작업 목표
YOLOv8 기반 교통량 분석 기능 추가

## 구현 방향
1. CCTV 영상에서 차량 감지 (실시간)
2. 교통량 카운팅 (차량 수 집계)
3. 혼잡도 예측 (머신러닝 모델)
4. 사고/정체 자동 감지 알림

## 기술 스택
- **YOLOv8**: 객체 감지 (차량, 보행자)
- **OpenCV**: 영상 처리
- **TensorFlow Lite**: 모델 경량화
- **WebSocket**: 실시간 알림

## 구현 단계

### 1. YOLOv8 모델 통합
```python
# app/services/ai_detector.py

from ultralytics import YOLO
import cv2

class TrafficDetector:
    def __init__(self):
        self.model = YOLO('yolov8n.pt')  # Nano 모델 (경량)
        self.vehicle_classes = [2, 3, 5, 7]  # car, motorcycle, bus, truck
    
    async def detect_vehicles(self, frame: np.ndarray) -> Dict:
        """차량 감지 및 카운팅"""
        results = self.model(frame, classes=self.vehicle_classes)
        
        vehicle_count = len(results[0].boxes)
        congestion_level = self._calculate_congestion(vehicle_count)
        
        return {
            'vehicle_count': vehicle_count,
            'congestion_level': congestion_level,
            'timestamp': datetime.now().isoformat()
        }
    
    def _calculate_congestion(self, count: int) -> str:
        """혼잡도 계산"""
        if count < 5:
            return 'low'
        elif count < 15:
            return 'medium'
        else:
            return 'high'
```

### 2. WebSocket 실시간 알림
```python
# app/api/websocket.py

from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

@router.websocket("/ws/traffic/{cctv_id}")
async def traffic_websocket(websocket: WebSocket, cctv_id: str):
    await manager.connect(websocket)
    
    while True:
        # 주기적으로 교통량 데이터 전송
        traffic_data = await detector.get_latest_data(cctv_id)
        await websocket.send_json(traffic_data)
        await asyncio.sleep(5)
```

### 3. Frontend 실시간 차트
```typescript
// src/components/TrafficChart.tsx

import { Line } from 'react-chartjs-2';

export const TrafficChart = ({ cctvId }: { cctvId: string }) => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/traffic/${cctvId}`);
    
    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(prev => [...prev.slice(-20), newData]);
    };
    
    return () => ws.close();
  }, [cctvId]);
  
  return <Line data={chartData} options={chartOptions} />;
};
```

## 주의사항
- GPU 필요 (CUDA 지원 권장)
- 높은 CPU/메모리 사용량
- 실시간 처리 시 지연 발생 가능
- 프로덕션 환경에서는 별도 AI 서버 권장

## 배포 고려사항
- AWS GPU 인스턴스 (g4dn.xlarge 이상)
- 또는 별도 AI 전용 서버 구성
- 비용: $500-1000/month
```

---

## 📚 Antigravity 사용 팁

### 효과적인 프롬프트 작성법

```markdown
**구조화된 프롬프트 템플릿:**

# [Phase 번호]: [작업 제목]

## 역할 정의
당신은 [시니어 백엔드 개발자/프론트엔드 전문가] 입니다.

## 작업 목표
[구체적인 목표 1-2문장]

## 기술 스펙
- 사용 기술: [A, B, C]
- 버전: [명시적 버전]
- 제약 사항: [있다면]

## 구현 요구사항
[코드 예시 또는 상세 설명]

## 테스트 기준
- [ ] 기능 A 동작
- [ ] 에러 핸들링 확인
- [ ] 성능 기준 충족

## 다음 단계
이 작업 완료 후 [다음 작업 힌트]
```

### 바이브코딩 워크플로우

```markdown
**1일차:** Phase 1-2 (프로젝트 구조 + API 연동)
  - 오전: Antigravity로 프로젝트 생성
  - 오후: API 테스트 및 디버깅

**2일차:** Phase 3 (지도 UI)
  - 지도 인터페이스 구현
  - 마커 및 인터랙션

**3일차:** Phase 4 (스트리밍)
  - FFmpeg 설정
  - 비디오 플레이어 통합

**4일차:** Phase 5 (배포)
  - Docker 설정
  - AWS 배포

**5일차:** 테스트 및 최적화
  - 버그 수정
  - 성능 튜닝
  - 문서화
```

### 디버깅 프롬프트 예시

```markdown
# Antigravity 디버깅 요청

## 문제 상황
```
Error: Cannot read property 'map' of undefined
    at MapContainer.tsx:45:12
```

## 발생 위치
- 파일: src/components/MapContainer.tsx
- 함수: handleMapBoundsChanged
- 라인: 45

## 재현 방법
1. 지도를 로드한다
2. 지도를 드래그한다
3. 에러 발생

## 관련 코드
```typescript
const handleMapBoundsChanged = async (map: kakao.maps.Map) => {
  const cctvList = await fetchCCTVList(bounds);
  setMarkers(cctvList.map(c => ({ id: c.id, ... })));  // 라인 45
};
```

## 기대 동작
지도 이동 시 CCTV 마커가 업데이트되어야 함

## 이미 시도한 해결책
- cctvList가 null인지 확인 → 여전히 에러
- try-catch 추가 → 에러는 잡히지만 근본 해결 안됨

이 에러의 원인을 분석하고 올바른 해결 방법을 제시하세요.
```

---

## 🔧 트러블슈팅 가이드

### 자주 발생하는 문제

#### 1. CORS 에러
```markdown
**증상**: 
- "Access to fetch has been blocked by CORS policy"

**해결책**:
- Backend에 CORS 미들웨어 추가
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 2. FFmpeg 설치 오류
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ffmpeg

# 설치 확인
ffmpeg -version
```

#### 3. Redis 연결 실패
```bash
# Redis 상태 확인
docker-compose logs redis

# Redis CLI 테스트
docker-compose exec redis redis-cli ping
# 응답: PONG
```

#### 4. 스트리밍 지연 문제
```markdown
**원인**: 
- 네트워크 대역폭 부족
- FFmpeg 설정 최적화 필요

**해결책**:
- HLS 세그먼트 시간 단축 (2초 → 1초)
- 비디오 비트레이트 조정
- WebRTC로 프로토콜 변경 고려
```

#### 5. 메모리 부족
```bash
# 메모리 사용량 확인
docker stats

# 스왑 메모리 추가 (AWS Lightsail)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📊 진행 상황 추적

### GitHub 프로젝트 보드 구조

```markdown
**Backlog**
- [ ] Phase 1: 프로젝트 초기화
- [ ] Phase 2: API 연동
- [ ] Phase 3: 지도 UI
- [ ] Phase 4: 스트리밍
- [ ] Phase 5: 배포
- [ ] Phase 6: AI 기능 (선택)

**In Progress**
- [🔄] 현재 작업 중인 Phase

**Testing**
- [🧪] 테스트 중인 기능들

**Done**
- [✅] 완료된 Phase들

**Blocked**
- [⚠️] API 키 발급 대기
- [⚠️] 서버 리소스 부족
```

### 일일 진행 노트 템플릿

```markdown
## 2026-01-XX 작업 일지

### 완료한 작업
- ✅ [작업 내용]
- ✅ [작업 내용]

### 진행 중인 작업
- 🔄 [작업 내용] (30% 완료)

### 막힌 부분
- ⚠️ [문제 상황]
- 💡 [시도한 해결책]

### 내일 할 일
- [ ] [작업 계획]

### 학습한 내용
- [새로 배운 기술/개념]

### Antigravity 프롬프트 히스토리
```
[사용한 주요 프롬프트 저장]
```
```

---

## 🎓 학습 리소스

### 공식 문서
- [Google Antigravity 시작하기](https://codelabs.developers.google.com/getting-started-google-antigravity?hl=ko)
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [React 공식 문서](https://react.dev/)
- [Kakao Map API 가이드](https://apis.map.kakao.com/web/)
- [FFmpeg 문서](https://ffmpeg.org/documentation.html)

### 참고 자료
- [AI Coding Best Practices](https://cloud.google.com/blog/topics/developers-practitioners/five-best-practices-for-using-ai-coding-assistants)
- [프롬프트 엔지니어링 가이드](https://www.digitalocean.com/resources/articles/prompt-engineering-best-practices)
- [HLS 스트리밍 가이드](https://developer.apple.com/streaming/)
- [Docker Compose 네트워킹](https://docs.docker.com/compose/networking/)

### 커뮤니티
- [Antigravity 디스코드](https://discord.gg/antigravity)
- [FastAPI 디스코드](https://discord.gg/fastapi)
- [Reddit r/PromptEngineering](https://reddit.com/r/PromptEngineering)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/fastapi+react)

---

## 🚀 빠른 시작 가이드

### 오늘 바로 시작하는 5단계

```bash
# 1. Antigravity 설치 및 열기
# Chrome 브라우저에서 Antigravity 다운로드 및 설치

# 2. 새 프로젝트 생성
# Antigravity에서 "New Project" → Phase 1 프롬프트 붙여넣기

# 3. API 키 발급
# ITS 국가교통정보센터: https://www.its.go.kr
# Kakao Developers: https://developers.kakao.com

# 4. 로컬 테스트
cd roadeye
docker-compose up -d
open http://localhost:3000

# 5. GitHub에 푸시
git init
git remote add origin https://github.com/jvisualschool/roadeye.git
git add .
git commit -m "🎉 Initial commit by Antigravity"
git push -u origin main
```

---

## 📝 API 키 발급 상세 가이드

### ITS 국가교통정보센터 API 키

1. **회원가입**
   - https://www.its.go.kr 접속
   - 우측 상단 "회원가입" 클릭
   - 이메일 인증 완료

2. **API 신청**
   - 로그인 후 "개방데이터" 메뉴
   - "CCTV 화상정보" 선택
   - "신청하기" 클릭

3. **활용계획서 작성**
   ```
   - 활용 목적: 교육/연구용 교통정보 시각화 웹앱
   - 서비스 개요: 실시간 교통 CCTV 지도 기반 웹 서비스
   - 예상 트래픽: 일 1,000건 미만
   ```

4. **승인 대기**
   - 보통 1-2 영업일 소요
   - 승인 시 이메일로 API 키 발급

### Kakao Map API 키

1. **애플리케이션 등록**
   - https://developers.kakao.com 접속
   - "내 애플리케이션" → "애플리케이션 추가하기"
   - 앱 이름: RoadEye

2. **플랫폼 등록**
   - "앱 설정" → "플랫폼"
   - "Web 플랫폼 등록"
   - 사이트 도메인: `http://localhost:3000`, `https://jvibeschool.com`

3. **JavaScript 키 복사**
   - "앱 키" → "JavaScript 키" 복사
   - `.env` 파일에 저장

---

## 💰 예상 비용 분석

### 개발 단계 (무료)
- Antigravity: 무료 (Gemini 3 Pro 포함)
- 로컬 개발: $0
- GitHub: $0 (Public Repository)

### 운영 비용 (월 기준)

#### 최소 구성
```
AWS Lightsail (2GB RAM): $20
도메인 (jvibeschool.com): $10/year
SSL 인증서: $0 (Let's Encrypt)
---
총 월 비용: ~$21
```

#### 권장 구성
```
AWS Lightsail (4GB RAM): $40
Redis 추가 스토리지: $5
백업 스냅샷: $5
트래픽 초과분: $10 (예상)
---
총 월 비용: ~$60
```

#### 프로덕션 구성 (고트래픽)
```
AWS EC2 t3.medium: $50
RDS Redis: $30
CloudFront CDN: $20
Route 53: $1
로드 밸런서: $20
---
총 월 비용: ~$121
```

### 비용 절감 팁
- 개발 초기: Lightsail 최소 플랜으로 시작
- 트래픽 모니터링: CloudWatch 무료 티어 활용
- 이미지 최적화: WebP 포맷 사용
- 캐싱 적극 활용: Redis TTL 설정

---

## 🎯 마일스톤 및 목표

### Week 1: MVP (Minimum Viable Product)
- [ ] 기본 프로젝트 구조 완성
- [ ] ITS API 연동 완료
- [ ] 지도에 CCTV 마커 표시
- [ ] 로컬 환경에서 동작 확인

### Week 2: 스트리밍 기능
- [ ] FFmpeg RTSP → HLS 변환
- [ ] Video.js 플레이어 통합
- [ ] 1-2개 CCTV 스트리밍 테스트

### Week 3: UI/UX 개선
- [ ] 반응형 디자인 적용
- [ ] 로딩/에러 상태 처리
- [ ] 즐겨찾기 기능
- [ ] 모바일 최적화

### Week 4: 배포 및 최적화
- [ ] AWS Lightsail 배포
- [ ] SSL 인증서 설정
- [ ] 성능 최적화
- [ ] 모니터링 설정

### Week 5+: 고급 기능 (선택)
- [ ] AI 교통량 분석
- [ ] 사용자 리뷰 시스템
- [ ] 교통 통계 대시보드
- [ ] 모바일 앱 (React Native)

---

## 📧 지원 및 문의

### 이슈 발생 시
1. GitHub Issues에 등록: https://github.com/jvisualschool/roadeye/issues
2. 이슈 템플릿 사용
3. 로그 파일 첨부

### 커뮤니티
- 이메일: jvisualschool@gmail.com
- Instagram: @jvisualschool
- Threads: @jvisualschool

### 기여하기
- Fork → Branch → Commit → Pull Request
- 코드 리뷰 환영
- 문서 개선 제안 환영

---

## 🏆 성공 사례 공유

프로젝트 완성 후:
- GitHub에 코드 공개
- 블로그 포스팅 (개발 과정)
- 유튜브 데모 영상
- 포트폴리오에 추가

---

## ⚖️ 라이선스 및 주의사항

### 오픈소스 라이선스
```
MIT License

Copyright (c) 2026 jvisualschool

Permission is hereby granted, free of charge...
```

### 법적 고지
- 공공 CCTV 데이터는 ITS 이용약관 준수
- 개인정보 보호법 준수 (얼굴 모자이크 등)
- 상업적 이용 시 별도 승인 필요

### API 사용 제한
- ITS API: 일 10,000건 제한
- Kakao Map: 일 300,000건 무료
- 초과 시 유료 전환 또는 승인 필요

---

## 📅 업데이트 로그

### v1.0.0 (2026-01-01)
- ✨ 초기 개발 가이드 작성
- 📝 Antigravity 프롬프트 전체 구성
- 🚀 배포 스크립트 포함

### 향후 계획
- [ ] 비디오 튜토리얼 제작
- [ ] 예제 코드 레포지토리
- [ ] 커뮤니티 포럼 개설

---

## 🙏 감사의 말

이 프로젝트는 다음 기술과 커뮤니티의 도움으로 만들어졌습니다:
- Google Antigravity Team
- ITS 국가교통정보센터
- Kakao Developers
- FastAPI Community
- React Community

---

**프로젝트를 시작하시겠습니까? Phase 1 프롬프트를 Antigravity에 붙여넣으세요! 🚀**

---

**문서 작성**: 2026-01-01  
**최종 수정**: 2026-01-01  
**버전**: 1.0.0  
**작성자**: AI Assistant for jvisualschool  
**GitHub**: https://github.com/jvisualschool/roadeye
