from pydantic import BaseModel
from typing import Optional

class CCTVInfo(BaseModel):
    cctv_id: str
    cctv_name: str
    lat: float
    lng: float
    stream_url: str
    owner: Optional[str] = "ITS"

class CCTVLocationRequest(BaseModel):
    lat: float
    lng: float
    radius: int = 5000  # 기본 반경 5km
