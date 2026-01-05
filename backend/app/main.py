from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import traceback

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="우리동네 CCTV API",
    description="대한민국 교통 CCTV 실시간 스트리밍 서비스를 위한 API 서버",
    version="1.0.0"
)

# 전역 예외 핸들러 추가
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    예상치 못한 예외를 처리하여 서버가 크래시되지 않도록 합니다.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    logger.error(f"Request URL: {request.url}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.",
            "error": str(exc)[:200]  # 에러 메시지 일부만 반환
        }
    )

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시에는 특정 도메인으로 제한 필요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import cctv, streaming

app.include_router(cctv.router, prefix="/api")
app.include_router(streaming.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "우리동네 CCTV API 서버가 정상 작동 중입니다."}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
