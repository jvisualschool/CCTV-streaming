# 프로젝트 보안 점검 보고서

**점검 일시**: 2026-01-05
**점검 목적**: GitHub 배포 전 민감 정보 노출 여부 및 보안 취약점 점검

## 1. 민감 정보 노출 점검

### ✅ 환경 변수 및 비밀 키 (Pass)
- **.env 파일**: `.gitignore`에 포함되어 있어 GitHub에 업로드되지 않습니다.
- **iTS 인증키 파일**: `iTS 인증키` 파일은 `.gitignore`의 `*인증키*` 패턴에 의해 차단됩니다.
- **Backend API Key**: `backend/app/services/its.py`에서 `settings.ITS_API_KEY`를 사용하며, 이는 환경 변수에서 로드되므로 코드 내 하드코딩된 비밀 키는 없습니다.

### ⚠️ 주의가 필요한 항목 (Warning)
- **Naver Maps Client ID**: 
  - 위치: `frontend/index.html` (Line 13) `ncpKeyId=rfal6goeqh`
  - 상태: Frontend 코드 특성상 Client ID 노출은 불가피하나, **Naver Cloud Platform 콘솔에서 Web 서비스 URL(Referer) 제한 설정을 반드시 적용**하여 무단 사용을 방지해야 합니다.

## 2. 서버 설정 점검

### ⚠️ CORS 설정 (Warning)
- 위치: `backend/app/main.py`
- 내용: `allow_origins=["*"]`로 설정되어 있어 모든 도메인에서의 요청을 허용합니다.
- 권장: 실제 운영 배포 시에는 프론트엔드 도메인(예: `https://jvibeschool.org`)만 허용하도록 변경하는 것이 좋습니다.

## 3. GitHub 배포 준비 상태
- `.gitignore` 설정이 적절하게 구성되어 있어 실수로 민감한 파일이 업로드될 가능성은 낮습니다.
- 현재 상태에서 `git add .` 후 커밋하여 배포해도 **치명적인 비밀번호나 Secret Key 유출 위험은 없는 것**으로 판단됩니다.

## 4. 권장 조치 사항
1. **Naver Cloud Platform 접속**: Console > AI·NAVER API > Application > [CCTV App] > Web 서비스 URL 설정에 배포할 도메인(예: `http://localhost:3000`, `https://your-domain.com`)을 등록하세요.
2. **CORS 제한**: 가능하다면 백엔드 `main.py`의 `allow_origins` 리스트를 구체적인 도메인으로 제한하세요.
3. **리포지토리 생성 후 확인**: GitHub에 푸시(Push)한 직후, 리포지토리 파일 목록에서 `.env` 파일이 없는지 한 번 더 육안으로 확인하세요.
