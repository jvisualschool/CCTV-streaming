import asyncio
import os
import shutil
import logging
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)

class StreamingService:
    def __init__(self, output_dir: str = "/tmp/hls"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.active_streams: Dict[str, asyncio.subprocess.Process] = {}
        self.max_streams = 10

    async def start_stream(self, cctv_id: str, rtsp_url: str) -> str:
        """
        RTSP 스트림을 HLS로 변환하기 시작합니다.
        """
        if len(self.active_streams) >= self.max_streams:
            # 가장 오래된 스트림을 끌 수도 있지만, 일단 에러 반환
            raise Exception("Maximum number of concurrent streams reached.")

        if cctv_id in self.active_streams:
            # 이미 스트리밍 중이면 기존 플레이리스트 경로 반환
            return f"/api/stream/{cctv_id}/playlist.m3u8"

        output_path = self.output_dir / cctv_id
        if output_path.exists():
            shutil.rmtree(output_path)
        output_path.mkdir(parents=True, exist_ok=True)

        playlist_file = output_path / "playlist.m3u8"
        
        # FFmpeg 명령
        ffmpeg_cmd = ["ffmpeg"]
        
        if rtsp_url.startswith("http"):
            # HLS/HTTP 입력인 경우 RTSP 옵션 제거
            ffmpeg_cmd.extend(["-i", rtsp_url])
        else:
            # RTSP 입력인 경우
            ffmpeg_cmd.extend(["-rtsp_transport", "tcp"])
            ffmpeg_cmd.extend(["-i", rtsp_url])

        # 공통 인코딩 옵션 (안정성 확보를 위해 재인코딩 수행)
        # 해상도/FPS는 프론트엔드에서 실제 재생 중인 비디오로부터 읽어서 표시하므로
        # 여기서는 원본 스트림 특성을 최대한 보존합니다.
        ffmpeg_cmd.extend([
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-c:a", "aac",
            "-b:a", "128k",
            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "5",
            "-hls_flags", "delete_segments+omit_endlist",
            "-hls_segment_filename", str(output_path / "segment_%03d.ts"),
            str(playlist_file)
        ])

        try:
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.active_streams[cctv_id] = process
            logger.info(f"Started streaming for CCTV: {cctv_id}")
            
            # 초기 에러 체크를 위한 짧은 대기
            await asyncio.sleep(1)
            
            # 프로세스가 이미 종료되었는지 확인
            if process.returncode is not None:
                # stderr 읽기 시도 (이미 종료된 경우)
                error_msg = "Unknown error"
                try:
                    if process.stderr:
                        # 비동기로 읽기
                        stderr_data = b""
                        while True:
                            chunk = await asyncio.wait_for(process.stderr.read(1024), timeout=0.1)
                            if not chunk:
                                break
                            stderr_data += chunk
                        if stderr_data:
                            error_msg = stderr_data.decode('utf-8', errors='ignore')
                except (asyncio.TimeoutError, Exception) as e:
                    logger.warning(f"Could not read stderr: {e}")
                
                # 에러 메시지에서 주요 정보 추출
                if "403" in error_msg or "Forbidden" in error_msg:
                    raise Exception("CCTV 서버가 접근을 거부했습니다 (403 Forbidden). 스트림 URL이 만료되었거나 접근 권한이 없습니다.")
                elif "404" in error_msg or "Not Found" in error_msg:
                    raise Exception("CCTV 스트림을 찾을 수 없습니다 (404 Not Found).")
                elif "Connection refused" in error_msg:
                    raise Exception("CCTV 서버에 연결할 수 없습니다.")
                else:
                    raise Exception(f"스트림 시작 실패: {error_msg[:200]}")
            
            # 백그라운드에서 에러 모니터링
            asyncio.create_task(self._monitor_stream(cctv_id, process))
            
            # 파일이 생성될 때까지 잠시 대기
            attempts = 0
            while not playlist_file.exists() and attempts < 20:
                await asyncio.sleep(0.5)
                attempts += 1
                
                # 대기 중 프로세스 종료 확인
                if process.returncode is not None:
                    # stderr 읽기 시도
                    error_msg = "Unknown error"
                    try:
                        if process.stderr:
                            stderr_data = b""
                            while True:
                                chunk = await asyncio.wait_for(process.stderr.read(1024), timeout=0.1)
                                if not chunk:
                                    break
                                stderr_data += chunk
                            if stderr_data:
                                error_msg = stderr_data.decode('utf-8', errors='ignore')
                    except (asyncio.TimeoutError, Exception):
                        pass
                    
                    if "403" in error_msg or "Forbidden" in error_msg:
                        raise Exception("CCTV 서버가 접근을 거부했습니다 (403 Forbidden). 스트림 URL이 만료되었거나 접근 권한이 없습니다.")
                    elif "404" in error_msg or "Not Found" in error_msg:
                        raise Exception("CCTV 스트림을 찾을 수 없습니다 (404 Not Found).")
                    else:
                        raise Exception(f"스트림 시작 실패: {error_msg[:200]}")
                
            if not playlist_file.exists():
                process.terminate()
                await process.wait()
                del self.active_streams[cctv_id]
                raise Exception("HLS 플레이리스트 파일 생성 실패. 스트림 URL을 확인해주세요.")

            return f"/api/stream/{cctv_id}/playlist.m3u8"

        except Exception as e:
            logger.error(f"Error starting stream: {e}")
            # 프로세스가 실행 중이면 정리
            if cctv_id in self.active_streams:
                try:
                    process = self.active_streams[cctv_id]
                    process.terminate()
                    await process.wait()
                    del self.active_streams[cctv_id]
                except:
                    pass
            raise

    async def stop_stream(self, cctv_id: str):
        """
        특정 CCTV의 스트리밍을 중단합니다.
        """
        if cctv_id in self.active_streams:
            process = self.active_streams[cctv_id]
            process.terminate()
            await process.wait()
            del self.active_streams[cctv_id]
            
            # 파일 정리
            output_path = self.output_dir / cctv_id
            if output_path.exists():
                shutil.rmtree(output_path)
            logger.info(f"Stopped streaming for CCTV: {cctv_id}")

    async def _monitor_stream(self, cctv_id: str, process: asyncio.subprocess.Process):
        """
        FFmpeg 프로세스 종료를 감시합니다.
        """
        try:
            # 프로세스가 종료될 때까지 대기
            returncode = await process.wait()
            
            # stderr 읽기 시도
            stderr_data = b""
            try:
                if process.stderr:
                    stderr_data = await process.stderr.read()
            except:
                pass
            
            if returncode != 0:
                error_msg = stderr_data.decode('utf-8', errors='ignore') if stderr_data else "Unknown error"
                logger.error(f"FFmpeg process for {cctv_id} exited with code {returncode}")
                logger.error(f"FFmpeg Error: {error_msg[:500]}")
            
            # active_streams에서 제거
            if cctv_id in self.active_streams:
                del self.active_streams[cctv_id]
                logger.info(f"Removed {cctv_id} from active streams (process exited)")
                
        except Exception as e:
            logger.error(f"Error monitoring stream {cctv_id}: {e}")
            # 에러가 발생해도 active_streams에서 제거
            if cctv_id in self.active_streams:
                del self.active_streams[cctv_id]

    def get_active_streams(self) -> List[str]:
        """
        활성 스트림 목록을 반환합니다.
        종료된 프로세스는 자동으로 정리합니다.
        """
        # 종료된 프로세스 정리
        dead_streams = []
        for cctv_id, process in list(self.active_streams.items()):
            if process.returncode is not None:
                dead_streams.append(cctv_id)
        
        for cctv_id in dead_streams:
            logger.warning(f"Cleaning up dead stream: {cctv_id}")
            del self.active_streams[cctv_id]
        
        return list(self.active_streams.keys())

# singleton instance
streaming_service = StreamingService()
