from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from pydantic import BaseModel
from app.services.streaming import streaming_service
from app.services.its import ITSService
import hashlib
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming"])

class StreamRequest(BaseModel):
    stream_url: str

@router.post("/start_by_url")
async def start_streaming_by_url(request: StreamRequest):
    """
    URL을 직접 입력받아 스트리밍을 시작합니다. (Mixed Content 해결용)
    """
    try:
        # URL을 해시하여 고유 ID 생성
        cctv_id = hashlib.md5(request.stream_url.encode()).hexdigest()
        
        hls_url = await streaming_service.start_stream(cctv_id, request.stream_url)
        return {"hls_url": hls_url, "cctv_id": cctv_id, "status": "started"}
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error in start_by_url: {error_message}")
        # 403 에러는 403 상태 코드로 반환
        if "403" in error_message or "Forbidden" in error_message:
            raise HTTPException(status_code=403, detail=error_message)
        # 404 에러는 404 상태 코드로 반환
        elif "404" in error_message or "Not Found" in error_message:
            raise HTTPException(status_code=404, detail=error_message)
        else:
            raise HTTPException(status_code=500, detail=error_message)

@router.post("/start/{cctv_id}")
async def start_streaming(cctv_id: str):
    """
    CCTV 스트리밍 변환을 시작합니다.
    """
    try:
        # ITS API에서 RTSP URL 가져오기
        rtsp_url = await ITSService.get_cctv_url(cctv_id)
        if not rtsp_url:
            raise HTTPException(status_code=404, detail="CCTV RTSP URL not found")
        
        hls_url = await streaming_service.start_stream(cctv_id, rtsp_url)
        return {"hls_url": hls_url, "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop/{cctv_id}")
async def stop_streaming(cctv_id: str):
    """
    CCTV 스트리밍 변환을 중단합니다.
    """
    await streaming_service.stop_stream(cctv_id)
    return {"status": "stopped"}

@router.get("/active")
async def get_active_streams():
    """
    현재 활성화된 스트리밍 목록을 반환합니다.
    """
    streams = streaming_service.get_active_streams()
    return {"count": len(streams), "streams": streams}

@router.get("/{cctv_id}/{file_name}")
async def serve_hls_file(cctv_id: str, file_name: str):
    """
    HLS 파일(.m3u8, .ts)을 제공합니다.
    """
    file_path = Path(f"/tmp/hls/{cctv_id}/{file_name}")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
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
