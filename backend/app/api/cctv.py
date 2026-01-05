from fastapi import APIRouter, Depends
from app.schemas.cctv import CCTVInfo, CCTVLocationRequest
from app.services.its import ITSService
from typing import List

router = APIRouter(prefix="/cctv", tags=["CCTV"])

@router.post("/nearby", response_model=List[CCTVInfo])
async def get_nearby_cctv(request: CCTVLocationRequest):
    """
    사용자의 현재 위치와 반경을 바탕으로 주변 CCTV 목록을 반환합니다.
    """
    # ITS CCTV는 주로 국도/고속도로에 있으므로 넓은 범위로 검색 (약 50km)
    min_x = request.lng - 0.5
    max_x = request.lng + 0.5
    min_y = request.lat - 0.5
    max_y = request.lat + 0.5
    
    return await ITSService.get_nearby_cctvs(min_x, max_x, min_y, max_y)

@router.get("/{cctv_id}/url")
async def get_cctv_stream_url(cctv_id: str):
    """
    특정 CCTV의 실시간 스트리밍 URL(HLS)을 반환합니다.
    """
    url = await ITSService.get_cctv_url(cctv_id)
    return {"stream_url": url}
