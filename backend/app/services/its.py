import httpx
import json
from typing import List, Optional
from app.core.config import settings
from app.schemas.cctv import CCTVInfo

class ITSService:
    BASE_URL = "https://openapi.its.go.kr:9443"

    @classmethod
    async def get_nearby_cctvs(cls, min_x: float, max_x: float, min_y: float, max_y: float) -> List[CCTVInfo]:
        """
        주어진 위경도 범위 내의 CCTV 정보를 가져옵니다.
        """
        url = f"{cls.BASE_URL}/cctvInfo"
        params = {
            "apiKey": settings.ITS_API_KEY,
            "type": "its",
            "cctvType": "1",  # 1: 실시간, 2: 정지영상
            "minX": min_x,
            "maxX": max_x,
            "minY": min_y,
            "maxY": max_y,
            "getType": "json"  # JSON 형식으로 응답 받기
        }
        
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            try:
                response = await client.get(url, params=params)
                print(f"ITS API Response Status: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"ITS API Error: {response.text[:500]}")
                    return []
                
                data = response.json()
                response_data = data.get('response', {})
                data_list = response_data.get('data', [])
                
                # data가 단일 항목일 경우 리스트로 변환
                if isinstance(data_list, dict):
                    data_list = [data_list]
                
                if not data_list:
                    print(f"No CCTV data found. Response: {response.text[:300]}")
                    return []
                
                cctvs = []
                for item in data_list:
                    try:
                        cctvs.append(CCTVInfo(
                            cctv_id=str(item.get('cctvid', '')),
                            cctv_name=item.get('cctvname', ''),
                            lat=float(item.get('coordy', 0)),
                            lng=float(item.get('coordx', 0)),
                            stream_url=item.get('cctvurl', ''),
                            owner=item.get('cctvformat', 'ITS')
                        ))
                    except Exception as e:
                        print(f"Error parsing CCTV item: {e}")
                        continue
                
                print(f"Found {len(cctvs)} CCTVs")
                return cctvs
                
            except Exception as e:
                print(f"Error calling ITS API: {e}")
                return []

    @classmethod
    async def get_cctv_url(cls, cctv_id: str) -> Optional[str]:
        """
        특정 CCTV의 실시간 스트리밍 URL을 가져옵니다.
        ITS API에서는 개별 CCTV 조회가 어려우므로 전체 목록에서 찾습니다.
        """
        # 넓은 범위로 검색
        cctvs = await cls.get_nearby_cctvs(124.0, 132.0, 33.0, 43.0)
        
        for cctv in cctvs:
            if cctv.cctv_id == cctv_id:
                return cctv.stream_url
        
        return None
