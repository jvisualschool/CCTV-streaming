import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, X, Activity } from 'lucide-react';

interface VideoPlayerProps {
    src: string;
    onClose: () => void;
    title: string;
    isLoading?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, onClose, title, isLoading }) => {
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [videoWidth, setVideoWidth] = useState<number | null>(null);
    const [videoHeight, setVideoHeight] = useState<number | null>(null);
    const [videoFps, setVideoFps] = useState<number | null>(null);

    useEffect(() => {
        let fpsRafId: number | null = null;

        const setupPlayer = () => {
            if (!playerRef.current && videoRef.current) {
                const videoElement = document.createElement("video-js");
                videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-city', 'vjs-custom-skin');
                videoRef.current.appendChild(videoElement);

                playerRef.current = videojs(videoElement, {
                    autoplay: true,
                    controls: true,
                    responsive: true,
                    fluid: true,
                    sources: src ? [{
                        src: src,
                        type: 'application/x-mpegURL'
                    }] : []
                });
            } else if (playerRef.current && src) {
                playerRef.current.src({ src: src, type: 'application/x-mpegURL' });
            }

            const player = playerRef.current;
            if (!player) return;

            // 메타데이터 로드 시 해상도 읽기
            player.on('loadedmetadata', () => {
                try {
                    const techEl: HTMLElement | null = player.el();
                    const videoTag = techEl?.getElementsByTagName('video')?.[0];
                    if (videoTag) {
                        if (videoTag.videoWidth && videoTag.videoHeight) {
                            setVideoWidth(videoTag.videoWidth);
                            setVideoHeight(videoTag.videoHeight);
                        }

                        // FPS 측정 루프
                        let lastFrameCount = 0;
                        let lastTime = performance.now();

                        const updateFps = () => {
                            const now = performance.now();
                            let totalFrames: number | undefined;

                            const anyVideo: any = videoTag as any;
                            if (typeof anyVideo.getVideoPlaybackQuality === 'function') {
                                const quality = anyVideo.getVideoPlaybackQuality();
                                totalFrames = quality.totalVideoFrames;
                            } else if (typeof anyVideo.webkitDecodedFrameCount === 'number') {
                                totalFrames = anyVideo.webkitDecodedFrameCount;
                            }

                            if (typeof totalFrames === 'number' && totalFrames >= 0) {
                                const deltaFrames = totalFrames - lastFrameCount;
                                const deltaTime = (now - lastTime) / 1000;

                                if (deltaTime >= 1 && deltaFrames >= 0) {
                                    const fps = deltaFrames / deltaTime;
                                    if (fps > 0) {
                                        setVideoFps(Math.round(fps));
                                    }
                                    lastFrameCount = totalFrames;
                                    lastTime = now;
                                }
                            }

                            fpsRafId = window.requestAnimationFrame(updateFps);
                        };

                        fpsRafId = window.requestAnimationFrame(updateFps);
                    }
                } catch {
                    // 해상도/FPS 읽기 실패 시 조용히 무시
                }
            });
        };

        setupPlayer();

        return () => {
            if (fpsRafId !== null) {
                window.cancelAnimationFrame(fpsRafId);
            }
        };
    }, [src]);

    useEffect(() => {
        const player = playerRef.current;
        return () => {
            if (player && !player.isDisposed()) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, []);

    // 실시간 날짜/시간 업데이트
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // ESC 키로 모달 닫기
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 backdrop-blur-md p-4 md:p-8"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden w-full max-w-5xl shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="size-10 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                            <Activity className="size-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">실시간 스트리밍 채널</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 px-4 py-2 bg-blue-600/20 rounded-xl border border-blue-500/20 mr-3">
                        <div className="flex items-center gap-2">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">LIVE</span>
                            <span className="text-sm font-bold text-white tabular-nums">{formatDateTime(currentTime)}</span>
                        </div>
                        {(videoWidth && videoHeight) || videoFps ? (
                            <div className="text-xs font-bold text-blue-300 tabular-nums">
                                {videoWidth && videoHeight && `${videoWidth}x${videoHeight}`}
                                {videoWidth && videoHeight && videoFps && ' @ '}
                                {videoFps && `${videoFps} FPS`}
                            </div>
                        ) : null}
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all rounded-xl border border-white/5"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Video Area */}
                <div className="relative aspect-video bg-black/40">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 backdrop-blur-sm"
                            >
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                                    <Loader2 className="size-16 text-blue-500 animate-spin relative" />
                                </div>
                                <motion.p
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-white font-semibold text-lg mt-8"
                                >
                                    스트리밍 엔진 가동 중
                                </motion.p>
                                <p className="text-xs text-slate-400 mt-2 font-medium">네트워크 환경에 따라 최대 10초가 소요됩니다.</p>
                            </motion.div>
                        ) : !src ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10"
                            >
                                <Camera className="size-16 text-slate-800 mb-6" />
                                <p className="text-slate-400 font-medium">영상을 연결할 수 없습니다.</p>
                                <button
                                    onClick={onClose}
                                    className="mt-6 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                                >
                                    돌아가기
                                </button>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                    <div data-vjs-player className="w-full h-full">
                        <div ref={videoRef} className="w-full h-full" />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-4 px-8 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-xs font-bold text-slate-300 tracking-tight uppercase">Live Stream Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Source: ITS (National Transport Center)</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default VideoPlayer;
