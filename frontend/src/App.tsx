import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Camera, Search, Play, Loader2, Map as MapIcon, ChevronLeft, ChevronRight, LocateFixed, Layers, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VideoPlayer from './components/VideoPlayer';

// 네이버 지도 타입 선언
declare global {
    interface Window {
        naver: any;
    }
}

interface CCTV {
    cctv_id: string;
    cctv_name: string;
    lat: number;
    lng: number;
    stream_url?: string;
    area?: string;
}

const API_BASE_URL = "/CCTV/api";

const App: React.FC = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [cctvs, setCctvs] = useState<CCTV[]>([]);
    const [selectedCCTV, setSelectedCCTV] = useState<CCTV | null>(null);
    const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
    const [isStreamingLoading, setIsStreamingLoading] = useState(false);
    const [streamCctvId, setStreamCctvId] = useState<string | null>(null); // 실제 스트림 ID 저장
    const [searchTerm, setSearchTerm] = useState('');
    const [, setMapReady] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [apiResponseTime, setApiResponseTime] = useState<number | null>(null);
    const [monthlyUsage, setMonthlyUsage] = useState(0);
    const [monthlyCost, setMonthlyCost] = useState(0);
    const [isSplashOpen, setIsSplashOpen] = useState(false);

    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<any[]>([]);

    const filteredCCTVs = useMemo(() =>
        cctvs.filter(cctv => cctv.cctv_name.includes(searchTerm)),
        [cctvs, searchTerm]
    );

    // 네이버 지도 API 사용량 관리 (로컬스토리지)
    const getMonthlyUsageKey = () => {
        const now = new Date();
        return `naver_map_usage_${now.getFullYear()}_${now.getMonth()}`;
    };

    const loadMonthlyUsage = () => {
        const key = getMonthlyUsageKey();
        const stored = localStorage.getItem(key);
        const usage = stored ? parseInt(stored, 10) : 0;
        setMonthlyUsage(usage);
        // 가격 계산: Dynamic Map 기준
        // 6,000,000건 이하: 무료
        // 6,000,000건 초과: (사용량 - 6,000,000) × 0.1원
        const freeLimit = 6000000;
        if (usage <= freeLimit) {
            setMonthlyCost(0);
        } else {
            setMonthlyCost(Math.round((usage - freeLimit) * 0.1));
        }
    };

    const incrementUsage = useCallback(() => {
        const key = getMonthlyUsageKey();
        setMonthlyUsage(prev => {
            const current = prev + 1;
            localStorage.setItem(key, current.toString());
            // 가격 계산: Dynamic Map 기준
            // 6,000,000건 이하: 무료
            // 6,000,000건 초과: (사용량 - 6,000,000) × 0.1원
            const freeLimit = 6000000;
            if (current <= freeLimit) {
                setMonthlyCost(0);
            } else {
                setMonthlyCost(Math.round((current - freeLimit) * 0.1));
            }
            return current;
        });
    }, []);

    // 주변 CCTV 가져오기
    const fetchCCTVs = async (lat: number, lng: number) => {
        setIsSearching(true);
        const startTime = performance.now();
        try {
            const response = await fetch(`${API_BASE_URL}/cctv/nearby`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng, radius: 5000 })
            });
            const data = await response.json();
            setCctvs(data);
            updateMarkers(data);
            
            // API 응답시간 측정
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            setApiResponseTime(responseTime);
        } catch (error) {
            console.error('Failed to fetch CCTVs:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // 마커 업데이트 (커스텀 스타일 적용)
    const updateMarkers = (data: CCTV[]) => {
        if (!mapRef.current) return;

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        data.forEach(cctv => {
            const content = `
                <div class="relative group">
                    <div class="absolute -inset-2 bg-blue-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg transform transition-transform hover:scale-110 active:scale-95 cursor-pointer">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    </div>
                </div>
            `;

            const marker = new window.naver.maps.Marker({
                position: new window.naver.maps.LatLng(cctv.lat, cctv.lng),
                map: mapRef.current,
                icon: {
                    content: content,
                    anchor: new window.naver.maps.Point(16, 16)
                }
            });

            window.naver.maps.Event.addListener(marker, 'click', () => {
                handleSelectCCTV(cctv);
            });

            markersRef.current.push(marker);
        });
    };

    const handleSelectCCTV = async (cctv: CCTV) => {
        setSelectedCCTV(cctv);
        setStreamingUrl(null);
        setStreamCctvId(null);
        setIsStreamingLoading(true);

        try {
            // Mixed Content 문제 해결: HTTP URL이면 백엔드 프록시 사용
            if (cctv.stream_url && cctv.stream_url.startsWith('http:')) {
                const response = await fetch(`${API_BASE_URL}/stream/start_by_url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stream_url: cctv.stream_url })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: '스트림 시작 실패' }));
                    const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
                    console.error('Stream start error:', errorMessage);
                    alert(`스트림 시작 실패: ${errorMessage}`);
                    throw new Error(errorMessage);
                }
                const data = await response.json();
                if (data.hls_url && data.cctv_id) {
                    // 백엔드가 반환하는 /api/stream/... 경로를 API_BASE_URL과 일치하도록 수정
                    let fullUrl: string;
                    if (data.hls_url.startsWith('http')) {
                        fullUrl = data.hls_url;
                    } else if (data.hls_url.startsWith('/api/')) {
                        // /api/stream/... -> /CCTV/api/stream/... 로 변환
                        fullUrl = `${window.location.origin}${data.hls_url.replace('/api', API_BASE_URL)}`;
                        console.log(`[DEBUG] URL 변환: ${data.hls_url} -> ${fullUrl}`);
                    } else {
                        fullUrl = `${window.location.origin}${data.hls_url}`;
                    }
                    console.log(`[DEBUG] 최종 스트리밍 URL: ${fullUrl}`);
                    setStreamingUrl(fullUrl);
                    setStreamCctvId(data.cctv_id); // 해시된 ID 저장
                }
            } else if (cctv.stream_url) {
                // HTTPS URL이면 직접 사용
                setStreamingUrl(cctv.stream_url);
                setStreamCctvId(cctv.cctv_id);
            } else {
                // stream_url이 없으면 ID 기반 API 사용
                const response = await fetch(`${API_BASE_URL}/stream/start/${cctv.cctv_id}`, {
                    method: 'POST'
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                if (data.hls_url) {
                    // 백엔드가 반환하는 /api/stream/... 경로를 API_BASE_URL과 일치하도록 수정
                    let fullUrl: string;
                    if (data.hls_url.startsWith('http')) {
                        fullUrl = data.hls_url;
                    } else if (data.hls_url.startsWith('/api/')) {
                        // /api/stream/... -> /CCTV/api/stream/... 로 변환
                        fullUrl = `${window.location.origin}${data.hls_url.replace('/api', API_BASE_URL)}`;
                        console.log(`[DEBUG] URL 변환: ${data.hls_url} -> ${fullUrl}`);
                    } else {
                        fullUrl = `${window.location.origin}${data.hls_url}`;
                    }
                    console.log(`[DEBUG] 최종 스트리밍 URL: ${fullUrl}`);
                    setStreamingUrl(fullUrl);
                    setStreamCctvId(cctv.cctv_id);
                }
            }
        } catch (error) {
            console.error('Failed to start streaming:', error);
        } finally {
            setIsStreamingLoading(false);
        }
    };

    const handleMyLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const center = new window.naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                mapRef.current.setCenter(center);
                mapRef.current.setZoom(15);
            });
        }
    };

    useEffect(() => {
        if (!window.naver || !window.naver.maps) return;

        const initialLat = 37.5665;
        const initialLng = 126.9780;

        const mapLoadStartTime = performance.now();
        
        const map = new window.naver.maps.Map(mapContainerRef.current, {
            center: new window.naver.maps.LatLng(initialLat, initialLng),
            zoom: 14,
            zoomControl: false,
            mapDataControl: false,
            scaleControl: false,
            logoControl: true,
            logoControlOptions: { position: window.naver.maps.Position.BOTTOM_RIGHT }
        });

        // 지도 로드 완료 시 사용량 증가 및 응답시간 측정
        window.naver.maps.Event.addListener(map, 'tilesloaded', () => {
            const mapLoadEndTime = performance.now();
            const loadTime = Math.round(mapLoadEndTime - mapLoadStartTime);
            setApiResponseTime(loadTime);
            incrementUsage();
        });

        mapRef.current = map;
        setMapReady(true);
        loadMonthlyUsage();
        fetchCCTVs(initialLat, initialLng);

        window.naver.maps.Event.addListener(map, 'idle', () => {
            const center = map.getCenter();
            fetchCCTVs(center.lat(), center.lng());
        });
    }, [incrementUsage]);

    // 실시간 날짜/시간 업데이트
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);


    // 날짜/시간 포맷팅 함수 (한 줄 형식)
    const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
    };

    return (
        <div className="relative w-full h-screen bg-[#020617] overflow-hidden font-sans text-slate-100">
            {/* 네이버 지도 배경 */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div
                    ref={mapContainerRef}
                    className="w-full h-full"
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* 오버레이 효과 - 제거됨 */}

            {/* 헤더 및 브랜드 */}
            <header className="absolute top-6 left-6 z-[100] flex items-center gap-4 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-3 rounded-2xl shadow-2xl">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Splash button clicked');
                        setIsSplashOpen(true);
                    }}
                    className="relative z-[101] p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    type="button"
                    style={{ pointerEvents: 'auto' }}
                >
                    <Camera className="text-white size-6 pointer-events-none" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">RoadEye</h1>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">우리동네 실시간 CCTV</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-xl border border-blue-500/20">
                    <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">LIVE</span>
                    <span className="text-sm font-bold text-white tabular-nums">{formatDateTime(currentTime)}</span>
                </div>
            </header>

            {/* 지도 컨트롤러 */}
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                <button
                    onClick={handleMyLocation}
                    className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/10 transition-all text-slate-400 hover:text-white shadow-2xl"
                >
                    <LocateFixed size={20} />
                </button>
                <div className="flex flex-col gap-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl">
                    <button onClick={() => mapRef.current.setZoom(mapRef.current.getZoom() + 1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">+</button>
                    <div className="h-px bg-white/5 mx-2" />
                    <button onClick={() => mapRef.current.setZoom(mapRef.current.getZoom() - 1)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">-</button>
                </div>
            </div>

            {/* 왼쪽 사이드바 */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ x: -400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -400, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="absolute left-6 top-28 bottom-28 w-80 z-20 flex flex-col bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 pb-2">
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="CCTV 위치 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 px-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500 transition-all"
                                />
                                <Search className="absolute left-4 top-4 text-slate-500 size-4 group-focus-within:text-blue-400 transition-colors" />
                                {isSearching && <Loader2 className="absolute right-4 top-4 text-blue-500 size-4 animate-spin" />}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-3">
                            <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#020617]/0 backdrop-blur-sm z-10 py-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">주변 CCTV {filteredCCTVs.length}곳</span>
                                <Layers size={14} className="text-slate-500" />
                            </div>

                            {filteredCCTVs.length > 0 ? (
                                filteredCCTVs.map((cctv) => (
                                    <motion.div
                                        key={cctv.cctv_id}
                                        layout
                                        onClick={() => handleSelectCCTV(cctv)}
                                        whileHover={{ y: -2, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${selectedCCTV?.cctv_id === cctv.cctv_id
                                            ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl transition-colors ${selectedCCTV?.cctv_id === cctv.cctv_id ? 'bg-white/20' : 'bg-blue-500/10 group-hover:bg-blue-500/20'}`}>
                                                <Play size={14} className={selectedCCTV?.cctv_id === cctv.cctv_id ? 'text-white' : 'text-blue-500'} fill="currentColor" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold truncate">{cctv.cctv_name}</h4>
                                                <p className={`text-[10px] mt-0.5 ${selectedCCTV?.cctv_id === cctv.cctv_id ? 'text-blue-100' : 'text-slate-500'}`}>{cctv.cctv_id}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-4">
                                    <MapIcon size={40} className="opacity-20" />
                                    <p className="text-xs font-medium">검색 결과가 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* 사이드바 토글 버튼 (플로팅) */}
            <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className={`absolute bottom-10 left-6 z-20 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl hover:bg-white/10 transition-all text-slate-400 hover:text-white ${isSidebarOpen ? '' : 'translate-x-0'} `}
            >
                {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>

            {/* 비디오 재생 모달/오버레이 */}
            <AnimatePresence>
                {selectedCCTV && (
                    <VideoPlayer
                        src={streamingUrl || ""}
                        title={selectedCCTV.cctv_name}
                        isLoading={isStreamingLoading}
                        onClose={() => {
                            if (streamCctvId) {
                                fetch(`${API_BASE_URL}/stream/stop/${streamCctvId}`, { 
                                    method: 'POST' 
                                }).catch(err => {
                                    console.warn('Failed to stop stream:', err);
                                });
                            }
                            setSelectedCCTV(null);
                            setStreamingUrl(null);
                            setStreamCctvId(null);
                        }}
                    />
                )}
            </AnimatePresence>


            {/* 푸터 */}
            <footer className="absolute bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 px-4 md:px-6 py-2.5">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 text-[9px] md:text-[10px] text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">RoadEye</span>
                        <span className="text-slate-500 hidden md:inline">|</span>
                        <span>
                            <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">React</a>
                            {' · '}
                            <a href="https://www.typescriptlang.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">TypeScript</a>
                            {' · '}
                            <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">FastAPI</a>
                            {' · '}
                            <a href="https://ffmpeg.org" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">FFmpeg</a>
                        </span>
                        <span className="text-slate-500 hidden md:inline">|</span>
                        <span>
                            제작자: <a href="mailto:jvisualschool@gmail.com" className="font-semibold hover:text-blue-400 transition-colors">Jinho Jung</a>
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <span className="text-slate-500 hidden md:inline">|</span>
                        <span className="font-semibold text-red-400">네이버 지도 API</span>
                        <span className="text-slate-300 tabular-nums">
                            응답: {apiResponseTime !== null ? `${apiResponseTime}ms` : '-'}
                        </span>
                        <span className="text-blue-400 tabular-nums">
                            사용량: {monthlyUsage.toLocaleString()}건
                        </span>
                        <span className="text-emerald-400 tabular-nums">
                            요금: {monthlyCost.toLocaleString()}원
                        </span>
                    </div>
                </div>
            </footer>

            {/* 안내 문구 */}
            {!selectedCCTV && (
                <div className="absolute bottom-16 right-28 z-20 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-[10px] font-bold text-slate-500 tracking-widest pointer-events-none">
                    지도 위의 마커를 클릭하여 실시간 영상을 확인하세요
                </div>
            )}

            {/* 스플래시 모달 */}
            <AnimatePresence>
                {isSplashOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => {
                            console.log('Splash backdrop clicked');
                            setIsSplashOpen(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="relative w-full max-w-4xl mx-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 닫기 버튼 */}
                            <button
                                onClick={() => setIsSplashOpen(false)}
                                className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            {/* 이미지 영역 */}
                            <div className="relative w-full h-96 md:h-[500px] overflow-hidden">
                                <img
                                    src="/CCTV/splash.jpg"
                                    alt="RoadEye Splash"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        console.error('Image load error, trying fallback');
                                        const target = e.target as HTMLImageElement;
                                        if (target.src.includes('/CCTV/')) {
                                            target.src = '/splash.jpg';
                                        } else {
                                            target.src = window.location.pathname.replace(/\/$/, '') + '/splash.jpg';
                                        }
                                    }}
                                />
                                {/* 상단 좌측에 앱 이름 */}
                                <div className="absolute top-6 left-6 text-white">
                                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
                                        RoadEye
                                    </h2>
                                    <p className="text-sm md:text-base text-slate-200 font-medium">
                                        우리동네 실시간 CCTV
                                    </p>
                                </div>
                                
                                {/* 하단 20%만 가리는 그라데이션 */}
                                <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
                                
                                {/* 이미지 하단에 1줄 정보 */}
                                <div className="absolute bottom-0 left-0 right-0 px-6 md:px-8 py-4 md:py-6">
                                    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm md:text-base text-slate-200">
                                        <span className="text-slate-400 font-semibold">기술 스택:</span>
                                        <a
                                            href="https://react.dev"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-white transition-colors"
                                        >
                                            React
                                        </a>
                                        <span className="text-slate-500">·</span>
                                        <a
                                            href="https://www.typescriptlang.org"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-white transition-colors"
                                        >
                                            TypeScript
                                        </a>
                                        <span className="text-slate-500">·</span>
                                        <a
                                            href="https://fastapi.tiangolo.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-white transition-colors"
                                        >
                                            FastAPI
                                        </a>
                                        <span className="text-slate-500">·</span>
                                        <a
                                            href="https://ffmpeg.org"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-white transition-colors"
                                        >
                                            FFmpeg
                                        </a>
                                        <span className="text-slate-500 mx-2">|</span>
                                        <span className="text-slate-400 font-semibold">제작자:</span>
                                        <span className="text-white font-semibold">Jinho Jung</span>
                                        <a
                                            href="mailto:jvisualschool@gmail.com"
                                            className="text-slate-300 hover:text-white transition-colors underline"
                                        >
                                            jvisualschool@gmail.com
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default App;
