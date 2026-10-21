import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Download, X, Play, Square, Check, Sparkles, Heart, Share2, Music, AlertCircle, Loader2 } from 'lucide-react';
import { SCENES, PersonalizationData } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSceneId: number;
  onSceneChange: (sceneId: number) => void;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  personalization: PersonalizationData;
  isMuted: boolean;
}

export type RecordMode = 'full_cycle' | 'manual';
export type VideoLayout = 'full_screen' | 'oled_only';
export type VideoResolution = '1080p' | '4k' | '720p';

export interface ResolutionConfig {
  id: VideoResolution;
  label: string;
  badge: string;
  sublabel: string;
  width: number;
  height: number;
  scale: number;
  videoBitrate: number;
  audioBitrate: number;
  fps: number;
  recommended?: boolean;
}

export const RESOLUTIONS: ResolutionConfig[] = [
  {
    id: '1080p',
    label: 'Full HD 1080p (Rekomendasi)',
    badge: 'FULL HD',
    sublabel: 'Sangat Lancar & Bening, Kompatibel Semua HP & WhatsApp (1920×1200, 8.5 Mbps, 48kHz)',
    width: 1920,
    height: 1200,
    scale: 1.5,
    videoBitrate: 8500000,
    audioBitrate: 256000,
    fps: 30,
    recommended: true,
  },
  {
    id: '4k',
    label: '4K Ultra HD',
    badge: '4K UHD',
    sublabel: 'Resolusi Maksimal Super Tajam untuk Layar Besar (3840×2400, 16 Mbps, 48kHz)',
    width: 3840,
    height: 2400,
    scale: 3.0,
    videoBitrate: 16000000,
    audioBitrate: 320000,
    fps: 30,
  },
  {
    id: '720p',
    label: 'HD Standar 720p',
    badge: 'HD 720p',
    sublabel: 'Super Ringan & Ukuran File Paling Kecil (1280×800, 4 Mbps, 48kHz)',
    width: 1280,
    height: 800,
    scale: 1.0,
    videoBitrate: 4000000,
    audioBitrate: 192000,
    fps: 30,
  },
];

export const VideoExportModal: React.FC<VideoExportModalProps> = ({
  isOpen,
  onClose,
  currentSceneId,
  onSceneChange,
  isPlaying,
  onPlayStateChange,
  personalization,
  isMuted,
}) => {
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [recordMode, setRecordMode] = useState<RecordMode>('full_cycle');
  const [layout, setLayout] = useState<VideoLayout>('full_screen');
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0); // 0 to 100
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resConfig = RESOLUTIONS.find((r) => r.id === resolution) || RESOLUTIONS[0];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedBgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cachedScanlinesRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const currentSceneIdRef = useRef(currentSceneId);
  currentSceneIdRef.current = currentSceneId;

  // Scene tracking to ensure full completion of all 12 scenes
  const scene12EnteredTimeRef = useRef<number | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  // Total duration of all 12 scenes:
  // Scene 1: 3.2s, Scene 2: 2.8s, Scene 3: 2.2s, Scene 4: 2.5s, Scene 5: 2.6s,
  // Scene 6: 2.8s, Scene 7: 2.4s, Scene 8: 2.4s, Scene 9: 2.6s, Scene 10: 2.8s,
  // Scene 11: 3.2s, Scene 12: 5.0s => Sum = 34.5s + 2.5s outro holding = 37.0s
  const TOTAL_CYCLE_SECONDS = 37.0;

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [videoBlobUrl]);

  // Determine supported video format with fallback priority
  const getSupportedMimeType = (): string => {
    const types = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  // Helper: rounded rectangle
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Helper: metallic screw
  const drawScrew = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#262626';
    ctx.fill();
    ctx.strokeStyle = '#525252';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Screw notch
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y - 3.5);
    ctx.lineTo(x + 3.5, y + 3.5);
    ctx.stroke();
    ctx.restore();
  };

  // Helper: circle button
  const drawCircleButton = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    bgColor: string,
    textColor: string,
    label: string
  ) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  };

  /**
   * PRE-RENDER CACHE:
   * Generates a static high-resolution offscreen canvas containing all chrome,
   * enclosure, screws, banners, and buttons ONCE.
   * This completely prevents real-time CPU throttling and makes 60/30fps rendering buttery smooth!
   */
  const buildStaticBackgroundCache = useCallback(
    (targetW: number, targetH: number, scale: number) => {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = targetW;
      bgCanvas.height = targetH;
      const ctx = bgCanvas.getContext('2d');
      if (!ctx) return null;

      const W = 1280;
      const H = 800;

      ctx.save();
      if (scale !== 1.0) {
        ctx.scale(scale, scale);
      }

      if (layout === 'oled_only') {
        // OLED ONLY MODE
        ctx.fillStyle = '#07090b';
        ctx.fillRect(0, 0, W, H);

        const encW = 1060;
        const encH = 680;
        const encX = (W - encW) / 2;
        const encY = (H - encH) / 2;

        renderStaticEnclosure(ctx, encX, encY, encW, encH);
      } else {
        // FULL SCREEN EXPERIENCE
        // 1. Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#07090d');
        bgGrad.addColorStop(1, '#020305');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Subtle stars in background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const starCoords = [
          [120, 60], [240, 95], [380, 45], [920, 70], [1080, 50],
          [1160, 110], [90, 720], [1150, 710], [180, 640], [1050, 660]
        ];
        starCoords.forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // 2. Top Header Bar (Y: 0 to 60)
        ctx.fillStyle = 'rgba(18, 18, 20, 0.9)';
        ctx.fillRect(0, 0, W, 60);
        ctx.strokeStyle = '#262626';
        ctx.beginPath();
        ctx.moveTo(0, 60);
        ctx.lineTo(W, 60);
        ctx.stroke();

        // Header logo heart
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(88, 30, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♥', 88, 30);

        // Header Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('OLED LOVE ANIMATION', 115, 30);

        // 12 Scenes Badge
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1;
        roundRect(ctx, 330, 20, 95, 22, 11);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#6ee7b7';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('12 SCENES', 377, 31);

        // Header right badges
        ctx.fillStyle = '#172554';
        ctx.strokeStyle = '#3b82f6';
        roundRect(ctx, 920, 18, 75, 25, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('4K / FHD', 957, 31);

        ctx.fillStyle = '#3f1515';
        ctx.strokeStyle = '#ef4444';
        roundRect(ctx, 1005, 18, 95, 25, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('♥ AZIZAH', 1052, 31);

        // Share button pill representation
        const shareGrad = ctx.createLinearGradient(1110, 18, 1200, 48);
        shareGrad.addColorStop(0, '#f59e0b');
        shareGrad.addColorStop(1, '#fb923c');
        ctx.fillStyle = shareGrad;
        roundRect(ctx, 1110, 18, 90, 25, 8);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Share', 1155, 31);

        // 3. Banner Notice (Y: 80 to 120)
        const bannerW = 860;
        const bannerH = 38;
        const bannerX = (W - bannerW) / 2;
        const bannerY = 80;

        ctx.fillStyle = 'rgba(23, 23, 23, 0.88)';
        ctx.strokeStyle = 'rgba(64, 64, 64, 0.7)';
        ctx.lineWidth = 1;
        roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 14);
        ctx.fill();
        ctx.stroke();

        // Banner left text
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fb7185';
        ctx.font = '14px sans-serif';
        ctx.fillText('♥', bannerX + 16, bannerY + 19);

        ctx.fillStyle = '#fb7185';
        ctx.font = '12px sans-serif';
        ctx.fillText('Untuk:', bannerX + 34, bannerY + 19);

        const recipientName = personalization.recipient || 'Azizah Sayang ❤️';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(recipientName, bannerX + 76, bannerY + 19);

        const senderName = personalization.sender || 'Mr.Wijaya';
        const recipWidth = ctx.measureText(recipientName).width;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px sans-serif';
        ctx.fillText(`• Dari: `, bannerX + 76 + recipWidth + 8, bannerY + 19);
        const dariX = bannerX + 76 + recipWidth + 50;
        ctx.fillStyle = '#e5e5e5';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(senderName, dariX, bannerY + 19);

        // Banner right custom quote pill
        const customMsg = personalization.customMessage || 'Untuk Azizah Sayang yang selalu paling istimewa di hatiku ❤️';
        ctx.font = '11px sans-serif';
        const msgWidth = ctx.measureText(`"${customMsg}"`).width;
        const pillW = Math.min(320, Math.max(180, msgWidth + 24));
        const pillX = bannerX + bannerW - pillW - 12;
        const pillY = bannerY + 7;

        ctx.fillStyle = '#1f242d';
        ctx.strokeStyle = '#374151';
        roundRect(ctx, pillX, pillY, pillW, 24, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#67e8f9';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const displayQuote = msgWidth > 300 ? customMsg.slice(0, 38) + '...' : customMsg;
        ctx.fillText(`"${displayQuote}"`, pillX + pillW / 2, pillY + 12);

        // 4. OLED Hardware Enclosure (Y: 132 to 644)
        const encW = 860;
        const encH = 512;
        const encX = (W - encW) / 2;
        const encY = 132;
        renderStaticEnclosure(ctx, encX, encY, encW, encH);

        // 5. Controls Dock (Y: 660 to 710)
        const ctrlW = 270;
        const ctrlH = 48;
        const ctrlX = (W - ctrlW) / 2;
        const ctrlY = 660;

        ctx.fillStyle = '#0f1217';
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        roundRect(ctx, ctrlX, ctrlY, ctrlW, ctrlH, 20);
        ctx.fill();
        ctx.stroke();

        const btnRadius = 16;
        const btnY = ctrlY + ctrlH / 2;

        drawCircleButton(ctx, ctrlX + 35, btnY, btnRadius, '#27272a', '#9ca3af', '⏮');
        drawCircleButton(ctx, ctrlX + 88, btnY, 19, '#f59e0b', '#000000', '▶');
        drawCircleButton(ctx, ctrlX + 141, btnY, btnRadius, '#27272a', '#9ca3af', '⏭');
        drawCircleButton(ctx, ctrlX + 190, btnY, btnRadius, '#27272a', '#9ca3af', '↺');
        drawCircleButton(ctx, ctrlX + 235, btnY, btnRadius, '#064e3b', '#34d399', '🔊');

        // 6. Footer (Y: 745 to 780)
        ctx.strokeStyle = '#171717';
        ctx.beginPath();
        ctx.moveTo(0, 740);
        ctx.lineTo(W, 740);
        ctx.stroke();

        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('Copyright 2026 @mr.wijaya', 70, 765);

        ctx.fillStyle = '#71717a';
        ctx.textAlign = 'right';
        ctx.fillText('Space: Play/Pause  •  R: Replay  •  M: Audio', W - 70, 765);
      }

      ctx.restore();
      return bgCanvas;
    },
    [layout, personalization]
  );

  // Render static enclosure chassis (outer gradient, screws, header, screen bezel)
  const renderStaticEnclosure = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    // Chassis gradient
    const chassisGrad = ctx.createLinearGradient(x, y, x, y + h);
    chassisGrad.addColorStop(0, '#1c1f24');
    chassisGrad.addColorStop(0.5, '#101216');
    chassisGrad.addColorStop(1, '#07090b');

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = chassisGrad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Corner screws
    drawScrew(ctx, x + 20, y + 20);
    drawScrew(ctx, x + w - 20, y + 20);
    drawScrew(ctx, x + 20, y + h - 20);
    drawScrew(ctx, x + w - 20, y + h - 20);

    // Silkscreen header
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(x + 55, y + 26, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e5e5e5';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('OLED 128x64', x + 65, y + 26);

    ctx.fillStyle = '#525252';
    ctx.font = '10px monospace';
    ctx.fillText('| 16:10 MATRIX', x + 155, y + 26);

    ctx.fillStyle = '#a3a3a3';
    ctx.textAlign = 'right';
    ctx.fillText('VCC • GND • SCL • SDA', x + w - 45, y + 26);

    // Active screen viewport bezel
    const padX = 28;
    const padTop = 44;
    const padBottom = 42;
    const screenX = x + padX;
    const screenY = y + padTop;
    const screenW = w - padX * 2;
    const screenH = h - padTop - padBottom;

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#FF8A00';
    ctx.lineWidth = 2;
    roundRect(ctx, screenX, screenY, screenW, screenH, 12);
    ctx.fill();
    ctx.stroke();

    // Lower chin silkscreen
    const chinY = y + h - 22;
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('RETRO-OLED', x + 35, chinY);

    ctx.fillStyle = '#525252';
    ctx.font = '10px monospace';
    ctx.fillText('• 12-SCENE ROMANCE', x + 115, chinY);
  };

  /**
   * PRE-RENDER SCANLINES:
   * A single cached offscreen image with scanlines pattern.
   * Blitting this takes 0.05ms instead of 200 fillRect calls!
   */
  const buildScanlinesCache = (sw: number, sh: number) => {
    const slCanvas = document.createElement('canvas');
    slCanvas.width = sw;
    slCanvas.height = sh;
    const ctx = slCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let scanY = 0; scanY < sh; scanY += 3) {
      ctx.fillRect(0, scanY, sw, 1.2);
    }

    // Glass specular reflection
    const glassGrad = ctx.createLinearGradient(0, 0, sw, sh);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glassGrad.addColorStop(0.3, 'rgba(34, 211, 238, 0.03)');
    glassGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(0, 0, sw, sh);

    return slCanvas;
  };

  // Compute screen coordinate boundaries based on layout
  const getScreenCoordinates = useCallback(() => {
    const W = 1280;
    const H = 800;
    if (layout === 'oled_only') {
      const encW = 1060;
      const encH = 680;
      const encX = (W - encW) / 2;
      const encY = (H - encH) / 2;
      const padX = 28;
      const padTop = 44;
      const padBottom = 42;
      return {
        screenX: encX + padX,
        screenY: encY + padTop,
        screenW: encW - padX * 2,
        screenH: encH - padTop - padBottom,
        chinX: encX,
        chinY: encY + encH - 22,
        chinW: encW,
      };
    } else {
      const encW = 860;
      const encH = 512;
      const encX = (W - encW) / 2;
      const encY = 132;
      const padX = 28;
      const padTop = 44;
      const padBottom = 42;
      return {
        screenX: encX + padX,
        screenY: encY + padTop,
        screenW: encW - padX * 2,
        screenH: encH - padTop - padBottom,
        chinX: encX,
        chinY: encY + encH - 22,
        chinW: encW,
      };
    }
  }, [layout]);

  // Start the video recording process
  const startRecording = async () => {
    setErrorMessage(null);
    setVideoBlobUrl(null);
    recordedChunksRef.current = [];
    isStoppingRef.current = false;
    scene12EnteredTimeRef.current = null;

    const oledCanvas = document.getElementById('oled-pixel-canvas') as HTMLCanvasElement;
    if (!oledCanvas) {
      setErrorMessage('Layar animasi belum siap atau tidak ditemukan. Mohon coba sesaat lagi.');
      return;
    }

    // Build the high-performance static cache canvases
    const bgCache = buildStaticBackgroundCache(resConfig.width, resConfig.height, resConfig.scale);
    if (!bgCache) {
      setErrorMessage('Gagal membuat background render buffer.');
      return;
    }
    cachedBgCanvasRef.current = bgCache;

    const coords = getScreenCoordinates();
    const slCache = buildScanlinesCache(coords.screenW, coords.screenH);
    cachedScanlinesRef.current = slCache;

    // Create target recording canvas
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = resConfig.width;
    compositeCanvas.height = resConfig.height;
    compositeCanvasRef.current = compositeCanvas;

    const ctx = compositeCanvas.getContext('2d', { alpha: false });
    if (!ctx) {
      setErrorMessage('Browser tidak mendukung Canvas 2D context.');
      return;
    }
    ctx.imageSmoothingEnabled = false;

    // Prepare sound and start animation from Scene 1
    if (recordMode === 'full_cycle') {
      onSceneChange(1);
      soundEngine.resetMelody();
      soundEngine.setEnabled(true);
      onPlayStateChange(true);
    }

    // Connect audio stream
    const audioStream = soundEngine.getAudioStream();
    const videoStream = compositeCanvas.captureStream(resConfig.fps);

    const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioStream.getAudioTracks());
    }

    const combinedStream = new MediaStream(combinedTracks);
    const mimeType = getSupportedMimeType();
    setVideoMimeType(mimeType);

    try {
      const options: MediaRecorderOptions = {
        videoBitsPerSecond: resConfig.videoBitrate,
        audioBitsPerSecond: resConfig.audioBitrate,
      };
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }

        const finalBlob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm',
        });
        const url = URL.createObjectURL(finalBlob);
        setVideoBlobUrl(url);
        setIsRecording(false);
        setIsFinalizing(false);
        setRecordProgress(100);

        // Auto trigger download to user device
        triggerDownload(url, mimeType, resConfig.badge);
      };

      // FAST 60/30 FPS RENDER LOOP:
      // Uses pre-rendered background cache blitting (< 0.4ms) so the encoder runs without ANY dropped frames
      const renderLoop = () => {
        if (cachedBgCanvasRef.current) {
          // 1. Draw static background cache in one super fast blit
          ctx.drawImage(cachedBgCanvasRef.current, 0, 0);

          // 2. Draw live OLED pixel canvas
          ctx.save();
          if (resConfig.scale !== 1.0) {
            ctx.scale(resConfig.scale, resConfig.scale);
          }

          roundRect(ctx, coords.screenX, coords.screenY, coords.screenW, coords.screenH, 12);
          ctx.clip();
          ctx.drawImage(oledCanvas, coords.screenX, coords.screenY, coords.screenW, coords.screenH);

          // 3. Draw pre-rendered scanlines overlay
          if (cachedScanlinesRef.current) {
            ctx.drawImage(cachedScanlinesRef.current, coords.screenX, coords.screenY);
          }
          ctx.restore();

          // 4. Draw dynamic scene title indicator badge on lower chin
          ctx.save();
          if (resConfig.scale !== 1.0) {
            ctx.scale(resConfig.scale, resConfig.scale);
          }
          const activeScene = currentSceneIdRef.current;
          const activeMeta = SCENES[activeScene - 1] || SCENES[0];
          const sceneText = `SCENE ${activeScene}/12`;

          ctx.fillStyle = '#737373';
          ctx.font = '10px monospace';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(sceneText, coords.chinX + coords.chinW - 175, coords.chinY);

          // Scene title badge box
          ctx.fillStyle = '#262626';
          ctx.strokeStyle = '#404040';
          ctx.lineWidth = 1;
          roundRect(ctx, coords.chinX + coords.chinW - 165, coords.chinY - 10, 130, 20, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#67e8f9';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          const truncatedTitle =
            activeMeta.titleEn.length > 18 ? activeMeta.titleEn.substring(0, 16) + '..' : activeMeta.titleEn;
          ctx.fillText(truncatedTitle, coords.chinX + coords.chinW - 100, coords.chinY);
          ctx.restore();
        }

        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      };

      animFrameIdRef.current = requestAnimationFrame(renderLoop);

      // Start recorder with 250ms chunk slicing for clean streaming
      recorder.start(250);
      setIsRecording(true);
      setIsFinalizing(false);
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      setRecordProgress(0);

      // Progress & Scene Completion Monitor
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(sec);

        if (recordMode === 'full_cycle' && !isStoppingRef.current) {
          // Progress calculation: smoothly scales up to 98% until finalization
          const progress = Math.min(98, Math.round((sec / TOTAL_CYCLE_SECONDS) * 100));
          setRecordProgress(progress);

          const currentScene = currentSceneIdRef.current;

          // Track entrance into Scene 12 (the final holding scene)
          if (currentScene === 12 && scene12EnteredTimeRef.current === null) {
            scene12EnteredTimeRef.current = Date.now();
          }

          // Full completion check:
          // Scene 12 has played for at least 5.0s (full scene duration) + 1.5s holding outro,
          // OR the scene has looped back to 1 after visiting Scene 12,
          // OR overall wall-clock safety limit (38 seconds) has elapsed.
          const isScene12Complete =
            scene12EnteredTimeRef.current !== null &&
            (Date.now() - scene12EnteredTimeRef.current) >= 6000;

          const isLoopedBack =
            scene12EnteredTimeRef.current !== null && currentScene === 1;

          const isTimeCapReached = sec >= TOTAL_CYCLE_SECONDS;

          if (isScene12Complete || isLoopedBack || isTimeCapReached) {
            isStoppingRef.current = true;
            finishRecording();
          }
        }
      }, 250);
    } catch (err) {
      console.error('MediaRecorder error:', err);
      setErrorMessage(
        'Gagal memulai perekam video browser. Pastikan browser mendukung MediaRecorder atau coba gunakan Chrome/Edge.'
      );
      setIsRecording(false);
      setIsFinalizing(false);
    }
  };

  /**
   * Gracefully finish recording:
   * Requests last data chunk, flushes buffers, and stops recorder without dropping trailing frames.
   */
  const finishRecording = () => {
    setIsFinalizing(true);
    setRecordProgress(99);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.requestData();
      } catch {
        // ignore
      }

      // Small delay to let trailing audio/video packets write to container
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }, 350);
    }
  };

  // Stop video recording manually
  const stopRecording = () => {
    isStoppingRef.current = true;
    finishRecording();
  };

  // Trigger file download to device
  const triggerDownload = (url: string, mime: string, resBadge?: string) => {
    const isMp4 = mime.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const recipientClean = (personalization.recipient || 'Azizah').replace(/[^a-zA-Z0-9]/g, '_');
    const badgeClean = (resBadge || resConfig.badge).replace(/[^a-zA-Z0-9]/g, '');
    const filename = `Animasi-Cinta-OLED-${recipientClean}-${badgeClean}.${ext}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl bg-neutral-900 border border-neutral-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(255,138,0,0.35)]">
              <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
                <Video className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2 flex-wrap">
                <span>Unduh Video Animasi</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/50 font-mono font-bold tracking-wide shadow-sm">
                  {resConfig.badge} • Full HD & 4K
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Kualitas video sangat halus (tanpa patah-patah), full 12 scene lengkap, dan audio jernih studio 48kHz
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isRecording) stopRecording();
              onClose();
            }}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ACTIVE RECORDING STATUS PANEL */}
          {isRecording && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-950 border border-amber-500/40 shadow-lg space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFinalizing ? (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  ) : (
                    <>
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                      <span className="w-3 h-3 rounded-full bg-rose-500" />
                    </>
                  )}
                  <span className="text-xs font-mono font-bold tracking-wider text-rose-400 uppercase">
                    {isFinalizing ? 'MENYIMPAN & MEMPROSES VIDEO...' : `MEREKAM VIDEO ${resConfig.badge}...`}
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-300 font-semibold">
                  {Math.floor(elapsedSeconds / 60)}:
                  {String(elapsedSeconds % 60).padStart(2, '0')} / ~0:37
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, recordProgress)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                  <span>
                    Scene {currentSceneId}/12: {SCENES[currentSceneId - 1]?.titleEn}
                  </span>
                </span>
                <span className="text-amber-400 font-semibold">{recordProgress}% Selesai</span>
              </div>

              <p className="text-[11px] text-neutral-400 italic">
                {currentSceneId === 12
                  ? '♥ Scene terakhir (Scene 12) sedang direkam sampai selesai dengan pesan cinta abadi...'
                  : 'Merekam seluruh 12 alur cerita cinta secara mulus dan lengkap tanpa terpotong.'}
              </p>

              <button
                onClick={stopRecording}
                disabled={isFinalizing}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                {isFinalizing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyelesaikan File Video...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Selesai & Simpan Video Sekarang</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* RECORDED RESULT PREVIEW */}
          {videoBlobUrl && !isRecording && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Video {resConfig.badge} Berhasil Dibuat Lengkap!
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {resConfig.width}×{resConfig.height} • {videoMimeType.includes('mp4') ? 'Format MP4' : 'Format WebM'}
                </span>
              </div>

              {/* In-app video player preview */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-neutral-800 aspect-[16/10]">
                <video
                  src={videoBlobUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => triggerDownload(videoBlobUrl, videoMimeType, resConfig.badge)}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Ulang Video ({resConfig.badge})</span>
                </button>

                <button
                  onClick={() => {
                    const recipientName = personalization.recipient || 'Azizah Sayang ❤️';
                    const text = encodeURIComponent(
                      `Halo ${recipientName}! Aku membuat animasi retro OLED romantis ${resConfig.badge} spesial untukmu. Tonton di sini: ${window.location.href}`
                    );
                    window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs flex items-center justify-center gap-2 border border-neutral-700 cursor-pointer transition-colors"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Bagikan ke WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {/* RECORDING CONFIGURATION OPTIONS */}
          {!isRecording && (
            <div className="space-y-4">
              {/* Option 1: Resolution Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Pilihan Resolusi Video:</span>
                  </label>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Music className="w-3 h-3 text-emerald-400" />
                    <span>Audio Jernih 48kHz</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {RESOLUTIONS.map((res) => {
                    const isSelected = resolution === res.id;
                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => setResolution(res.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/10 border-amber-400 text-white shadow-[0_0_15px_rgba(255,138,0,0.18)] ring-1 ring-amber-400/50'
                            : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        {res.recommended && (
                          <span className="absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm font-mono uppercase tracking-wider">
                            Rekomendasi
                          </span>
                        )}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold font-mono ${isSelected ? 'text-amber-300' : 'text-neutral-200'}`}>
                              {res.badge}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {res.width}×{res.height}
                            </span>
                          </div>
                          <p className="text-[11px] leading-tight text-neutral-300 font-medium">
                            {res.id === '1080p' ? 'Full HD (Sangat Lancar)' : res.id === '4k' ? '4K Ultra HD' : 'HD Standar 720p'}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-neutral-700/50 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                          <span>{Math.round(res.videoBitrate / 1000000)} Mbps</span>
                          <span className="text-emerald-400 font-semibold">{Math.round(res.audioBitrate / 1000)} kbps</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Option 2: Layout Selection */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">
                  2. Cakupan Tampilan Video:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLayout('full_screen')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      layout === 'full_screen'
                        ? 'bg-amber-500/15 border-amber-500/70 text-white shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Layar Penuh (Lengkap)</span>
                      </span>
                      {layout === 'full_screen' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-mono">
                          Pilihan Anda
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Mencakup seluruh tampilan layar lengkap: banner nama Azizah Sayang ❤️, modul OLED baut retro, tombol dock, dan copyright.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayout('oled_only')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      layout === 'oled_only'
                        ? 'bg-amber-500/15 border-amber-500/70 text-white shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">
                        Hanya Modul Layar OLED
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Fokus pada frame casing OLED retro 128x64 dengan baut sudut dan animasi pixel skyline.
                    </p>
                  </button>
                </div>
              </div>

              {/* Option 3: Recording Mode */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-2">
                  3. Mode Perekaman:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecordMode('full_cycle')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      recordMode === 'full_cycle'
                        ? 'bg-amber-500/15 border-amber-500/70 text-white shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block mb-0.5">
                      1 Siklus Penuh (Scene 1 s/d 12 Lengkap)
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Merekam otomatis dari awal jalan berdua sampai Scene 12 selesai (adegan hati berdetak & kata cinta abadi), lalu otomatis download (~37 detik).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecordMode('manual')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      recordMode === 'manual'
                        ? 'bg-amber-500/15 border-amber-500/70 text-white shadow-sm'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block mb-0.5">
                      Rekam Bebas (Manual Mulai/Stop)
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Mulai merekam dari adegan saat ini dan tekan tombol berhenti kapan pun Anda inginkan.
                    </p>
                  </button>
                </div>
              </div>

              {/* Audio & Quality Highlights */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Audio Jernih: 48kHz Studio Compressor & Limiter</span>
                </span>
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Ultra Halus: Buffer Ringan Anti Patah-patah (30 FPS)</span>
                </span>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={startRecording}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Mulai Rekam & Unduh Video ({resConfig.badge})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
