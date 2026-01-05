# 🚀 우리동네 CCTV 배포 가이드

## 서버 접속 정보

### SSH 접속
```bash
ssh -i ~/.ssh/jvibeschool_org.pem bitnami@[SERVER_IP]
```

> ⚠️ **보안 주의**: 실제 서버 IP는 별도 보안 문서 또는 환경변수 참조
> - 서버 IP는 AWS Lightsail 콘솔에서 확인
> - SSH 키 파일: `~/.ssh/jvibeschool_org.pem`
> - SSH 사용자: `bitnami`

### 웹 루트 경로
```
/opt/bitnami/apache/htdocs/CCTV/
```

---

## 프론트엔드 배포

### 1. 로컬에서 빌드
```bash
cd frontend
npm run build
```

### 2. 서버로 전송
```bash
scp -i ~/.ssh/jvibeschool_org.pem -r dist/* bitnami@[SERVER_IP]:/opt/bitnami/apache/htdocs/CCTV/
```

---

## 백엔드 배포

### 1. 백엔드 파일 전송
```bash
scp -i ~/.ssh/jvibeschool_org.pem -r backend bitnami@[SERVER_IP]:/opt/bitnami/apache/htdocs/CCTV/
```

### 2. 서버에서 의존성 설치
```bash
cd /opt/bitnami/apache/htdocs/CCTV/backend
pip3 install -r requirements.txt
```

### 3. 환경변수 설정 (.env 파일)
```bash
# /opt/bitnami/apache/htdocs/CCTV/backend/.env
ITS_API_KEY=[ITS_API_KEY_HERE]
REDIS_HOST=localhost
REDIS_PORT=6379
```

> ⚠️ **보안 주의**: ITS API 키는 https://www.its.go.kr 에서 발급받아 직접 입력

### 4. systemd 서비스로 실행 (권장)
```bash
# /etc/systemd/system/cctv-backend.service 생성
sudo systemctl start cctv-backend
sudo systemctl enable cctv-backend
```

---

## Apache 프록시 설정

`/CCTV/api/*` 요청을 백엔드(포트 8000)로 프록시:

```apache
# /opt/bitnami/apache/conf/vhosts/cctv-proxy.conf
ProxyPass /CCTV/api http://localhost:8000/api
ProxyPassReverse /CCTV/api http://localhost:8000/api
```

```bash
sudo /opt/bitnami/ctlscript.sh restart apache
```

---

## 서비스 URL

- **프론트엔드**: https://jvibeschool.org/CCTV/
- **백엔드 API**: https://jvibeschool.org/CCTV/api/
- **헬스 체크**: https://jvibeschool.org/CCTV/api/health

---

## 문제 해결

### CCTV 0곳 표시 시
1. 백엔드 서버 실행 확인: `curl http://localhost:8000/health`
2. API 키 설정 확인: `.env` 파일 확인
3. 로그 확인: `journalctl -u cctv-backend -f`

### 스트리밍 오류 시
1. FFmpeg 설치 확인: `which ffmpeg`
2. HLS 디렉토리 권한 확인: `/tmp/hls/`

---

*Last updated: 2026-01-05*
