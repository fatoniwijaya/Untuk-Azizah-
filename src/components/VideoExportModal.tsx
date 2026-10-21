import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Download, X, Play, Square, Check, RefreshCw, Sparkles, Heart, Share2, Music, AlertCircle } from 'lucide-react';
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
export type VideoResolution = '4k' | '1080p' | '720p';

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
  recommended?: boolean;
}

export const RESOLUTIONS: ResolutionConfig[] = [
  {
    id: '4k',
    label: '4K Ultra HD',
    badge: '4K UHD',
    sublabel: 'Resolusi Tertinggi & Sangat Tajam (3840×2400, 30 Mbps, Audio 320 kbps)',
    width: 3840,
    height: 2400,
    scale: 3.0,
    videoBitrate: 30000000,
    audioBitrate: 320000,
    recommended: true,
  },
  {
    id: '1080p',
    label: 'Full HD 1080p',
    badge: 'FULL HD',
    sublabel: 'Kualitas Tinggi & Bening (1920×1200, 14 Mbps, Audio 320 kbps)',
    width: 1920,
    height: 1200,
    scale: 1.5,
    videoBitrate: 14000000,
    audioBitrate: 320000,
  },
  {
    id: '720p',
    label: 'HD Standar 720p',
    badge: 'HD 720p',
    sublabel: 'Cepat & Ringan (1280×800, 6 Mbps, Audio 256 kbps)',
    width: 1280,
    height: 800,
    scale: 1.0,
    videoBitrate: 6000000,
    audioBitrate: 256000,
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
  const [resolution, setResolution] = useState<VideoResolution>('4k');
  const [recordMode, setRecordMode] = useState<RecordMode>('full_cycle');
  const [layout, setLayout] = useState<VideoLayout>('full_screen');
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0); // 0 to 100
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoMimeType, setVideoMimeType] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resConfig = RESOLUTIONS.find((r) => r.id === resolution) || RESOLUTIONS[0];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const currentSceneIdRef = useRef(currentSceneId);
  currentSceneIdRef.current = currentSceneId;

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

  // Determine supported video format
  const getSupportedMimeType = (): string => {
    const types = [
      'video/mp4;codecs=avc1,mp4a.40.2',
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
    return 'video/webm';
  };

  // Draw composite frame replicating the full display layout matching user's image
  const drawCompositeFrame = useCallback(
    (
      targetCtx: CanvasRenderingContext2D,
      oledCanvas: HTMLCanvasElement,
      currentScene: number,
      scale: number = 1.0
    ) => {
      const W = 1280;
      const H = 800;

      targetCtx.save();
      if (scale !== 1.0) {
        targetCtx.scale(scale, scale);
      }

      if (layout === 'oled_only') {
        // OLED ONLY MODE: 1000 x 640
        targetCtx.fillStyle = '#07090b';
        targetCtx.fillRect(0, 0, W, H);

        const encW = 1060;
        const encH = 680;
        const encX = (W - encW) / 2;
        const encY = (H - encH) / 2;

        drawOledEnclosure(targetCtx, oledCanvas, encX, encY, encW, encH, currentScene);
        targetCtx.restore();
        return;
      }

      // FULL SCREEN MODE: Exactly matching the uploaded screenshot
      // 1. App background
      targetCtx.fillStyle = '#07090d';
      targetCtx.fillRect(0, 0, W, H);

      // Subtle ambient backlight behind OLED
      const radial = targetCtx.createRadialGradient(W / 2, 420, 50, W / 2, 420, 480);
      radial.addColorStop(0, 'rgba(255, 138, 0, 0.08)');
      radial.addColorStop(1, 'transparent');
      targetCtx.fillStyle = radial;
      targetCtx.fillRect(0, 0, W, H);

      // 2. Top Header Bar (Y: 18 to 60)
      targetCtx.fillStyle = 'rgba(18, 20, 24, 0.85)';
      targetCtx.fillRect(0, 0, W, 64);
      targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      targetCtx.lineWidth = 1;
      targetCtx.beginPath();
      targetCtx.moveTo(0, 64);
      targetCtx.lineTo(W, 64);
      targetCtx.stroke();

      // Header logo circle
      const logoX = 70;
      const logoY = 32;
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.arc(logoX, logoY, 17, 0, Math.PI * 2);
      targetCtx.fillStyle = '#000000';
      targetCtx.fill();
      targetCtx.strokeStyle = '#f59e0b';
      targetCtx.lineWidth = 2;
      targetCtx.stroke();

      // Little heart inside logo
      targetCtx.fillStyle = '#f59e0b';
      targetCtx.font = '14px sans-serif';
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillText('♥', logoX, logoY);
      targetCtx.restore();

      // Header title
      targetCtx.fillStyle = '#ffffff';
      targetCtx.font = 'bold 15px monospace';
      targetCtx.textAlign = 'left';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillText('OLED LOVE ANIMATION', 98, 25);

      // 12 Scenes badge
      targetCtx.fillStyle = '#022c22';
      targetCtx.strokeStyle = '#065f46';
      targetCtx.lineWidth = 1;
      roundRect(targetCtx, 290, 16, 75, 18, 9);
      targetCtx.fill();
      targetCtx.stroke();
      targetCtx.fillStyle = '#34d399';
      targetCtx.font = 'bold 10px monospace';
      targetCtx.textAlign = 'center';
      targetCtx.fillText('12 SCENES', 327, 25);

      // Subtitle
      targetCtx.fillStyle = '#9ca3af';
      targetCtx.font = '11px sans-serif';
      targetCtx.textAlign = 'left';
      targetCtx.fillText('Retro pixel-art romantic story with cityscape & heart transformation', 98, 44);

      // Header right badges (Untuk Azizah & Share)
      const recipientName = personalization.recipient || 'Azizah';
      // "Untuk Azizah" badge
      targetCtx.fillStyle = '#262626';
      targetCtx.strokeStyle = '#404040';
      roundRect(targetCtx, 970, 18, 125, 30, 10);
      targetCtx.fill();
      targetCtx.stroke();
      targetCtx.fillStyle = '#fb7185';
      targetCtx.font = '11px sans-serif';
      targetCtx.fillText('♥', 982, 33);
      targetCtx.fillStyle = '#e5e5e5';
      targetCtx.font = '11px sans-serif';
      targetCtx.fillText(`Untuk ${recipientName}`, 998, 33);

      // "Share" badge
      const shareGrad = targetCtx.createLinearGradient(1110, 18, 1200, 18);
      shareGrad.addColorStop(0, '#f59e0b');
      shareGrad.addColorStop(1, '#fb923c');
      targetCtx.fillStyle = shareGrad;
      roundRect(targetCtx, 1110, 18, 90, 30, 10);
      targetCtx.fill();
      targetCtx.fillStyle = '#000000';
      targetCtx.font = 'bold 11px sans-serif';
      targetCtx.textAlign = 'center';
      targetCtx.fillText('Share', 1155, 33);

      // 3. Banner Notice (Y: 80 to 120)
      const bannerW = 860;
      const bannerH = 38;
      const bannerX = (W - bannerW) / 2;
      const bannerY = 80;

      targetCtx.fillStyle = 'rgba(23, 23, 23, 0.85)';
      targetCtx.strokeStyle = 'rgba(64, 64, 64, 0.7)';
      targetCtx.lineWidth = 1;
      roundRect(targetCtx, bannerX, bannerY, bannerW, bannerH, 14);
      targetCtx.fill();
      targetCtx.stroke();

      // Banner left text
      targetCtx.textAlign = 'left';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillStyle = '#fb7185';
      targetCtx.font = '14px sans-serif';
      targetCtx.fillText('♥', bannerX + 16, bannerY + 19);

      targetCtx.fillStyle = '#fb7185';
      targetCtx.font = '12px sans-serif';
      targetCtx.fillText('Untuk:', bannerX + 34, bannerY + 19);

      targetCtx.fillStyle = '#ffffff';
      targetCtx.font = 'bold 12px sans-serif';
      targetCtx.fillText(recipientName, bannerX + 76, bannerY + 19);

      const senderName = personalization.sender || 'Mr.Wijaya';
      targetCtx.fillStyle = '#9ca3af';
      targetCtx.font = '12px sans-serif';
      targetCtx.fillText(`• Dari: `, bannerX + 76 + targetCtx.measureText(recipientName).width + 8, bannerY + 19);
      const dariX = bannerX + 76 + targetCtx.measureText(recipientName).width + 48;
      targetCtx.fillStyle = '#e5e5e5';
      targetCtx.font = 'bold 12px sans-serif';
      targetCtx.fillText(senderName, dariX, bannerY + 19);

      // Banner right custom quote pill
      const customMsg = personalization.customMessage || 'Untuk seseorang yang selalu spesial ❤️';
      targetCtx.font = '11px sans-serif';
      const msgWidth = targetCtx.measureText(`"${customMsg}"`).width;
      const pillW = Math.max(180, msgWidth + 24);
      const pillX = bannerX + bannerW - pillW - 12;
      const pillY = bannerY + 7;

      targetCtx.fillStyle = '#1f242d';
      targetCtx.strokeStyle = '#374151';
      roundRect(targetCtx, pillX, pillY, pillW, 24, 8);
      targetCtx.fill();
      targetCtx.stroke();

      targetCtx.fillStyle = '#67e8f9';
      targetCtx.font = '11px sans-serif';
      targetCtx.textAlign = 'center';
      targetCtx.fillText(`"${customMsg}"`, pillX + pillW / 2, pillY + 12);

      // 4. OLED Display Enclosure (Y: 132 to 642)
      const encW = 860;
      const encH = 512;
      const encX = (W - encW) / 2;
      const encY = 132;

      drawOledEnclosure(targetCtx, oledCanvas, encX, encY, encW, encH, currentScene);

      // 5. Controls Dock (Y: 660 to 710)
      const ctrlW = 270;
      const ctrlH = 48;
      const ctrlX = (W - ctrlW) / 2;
      const ctrlY = 660;

      targetCtx.fillStyle = '#0f1217';
      targetCtx.strokeStyle = '#27272a';
      targetCtx.lineWidth = 1;
      roundRect(targetCtx, ctrlX, ctrlY, ctrlW, ctrlH, 20);
      targetCtx.fill();
      targetCtx.stroke();

      // Draw the 5 buttons representation
      const btnRadius = 16;
      const btnY = ctrlY + ctrlH / 2;

      // 1. Prev Button
      drawCircleButton(targetCtx, ctrlX + 35, btnY, btnRadius, '#27272a', '#9ca3af', '⏮');
      // 2. Play/Pause Button (amber glowing center)
      targetCtx.save();
      targetCtx.shadowColor = 'rgba(245, 158, 11, 0.4)';
      targetCtx.shadowBlur = 12;
      drawCircleButton(targetCtx, ctrlX + 88, btnY, 19, '#f59e0b', '#000000', isPlaying ? '⏸' : '▶');
      targetCtx.restore();
      // 3. Next Button
      drawCircleButton(targetCtx, ctrlX + 141, btnY, btnRadius, '#27272a', '#9ca3af', '⏭');
      // 4. Replay Button
      drawCircleButton(targetCtx, ctrlX + 190, btnY, btnRadius, '#27272a', '#9ca3af', '↺');
      // 5. Audio Button
      drawCircleButton(targetCtx, ctrlX + 235, btnY, btnRadius, '#064e3b', '#34d399', isMuted ? '🔇' : '🔊');

      // 6. Footer (Y: 745 to 780)
      targetCtx.strokeStyle = '#171717';
      targetCtx.beginPath();
      targetCtx.moveTo(0, 740);
      targetCtx.lineTo(W, 740);
      targetCtx.stroke();

      targetCtx.fillStyle = '#9ca3af';
      targetCtx.font = '11px monospace';
      targetCtx.textAlign = 'left';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillText('Copyright 2026 @mr.wijaya', 70, 765);

      targetCtx.fillStyle = '#71717a';
      targetCtx.textAlign = 'right';
      targetCtx.fillText('Space: Play/Pause  •  R: Replay  •  M: Audio', W - 70, 765);

      targetCtx.restore();
    },
    [layout, personalization, isPlaying, isMuted]
  );

  // Draw the OLED Hardware Enclosure
  const drawOledEnclosure = (
    ctx: CanvasRenderingContext2D,
    oledCanvas: HTMLCanvasElement,
    x: number,
    y: number,
    w: number,
    h: number,
    sceneId: number
  ) => {
    // Outer chassis gradient
    const chassisGrad = ctx.createLinearGradient(x, y, x, y + h);
    chassisGrad.addColorStop(0, '#1c1f24');
    chassisGrad.addColorStop(0.5, '#101216');
    chassisGrad.addColorStop(1, '#07090b');

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = chassisGrad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 24);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4 Corner screws
    drawScrew(ctx, x + 20, y + 20);
    drawScrew(ctx, x + w - 20, y + 20);
    drawScrew(ctx, x + 20, y + h - 20);
    drawScrew(ctx, x + w - 20, y + h - 20);

    // Silkscreen header text (OLED 128x64 | VCC GND SCL SDA)
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

    // Active screen viewport
    const padX = 28;
    const padTop = 44;
    const padBottom = 42;
    const screenX = x + padX;
    const screenY = y + padTop;
    const screenW = w - padX * 2;
    const screenH = h - padTop - padBottom;

    // Screen border glow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 138, 0, 0.45)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#FF8A00';
    ctx.lineWidth = 2;
    roundRect(ctx, screenX, screenY, screenW, screenH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw the actual pixel canvas image
    ctx.save();
    roundRect(ctx, screenX, screenY, screenW, screenH, 12);
    ctx.clip();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(oledCanvas, screenX, screenY, screenW, screenH);

    // Vintage scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let scanY = screenY; scanY < screenY + screenH; scanY += 3) {
      ctx.fillRect(screenX, scanY, screenW, 1.2);
    }

    // Glass specular reflection
    const glassGrad = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glassGrad.addColorStop(0.3, 'rgba(34, 211, 238, 0.03)');
    glassGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // Vignette
    ctx.restore();

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

    // Scene badge
    const activeMeta = SCENES[sceneId - 1] || SCENES[0];
    const sceneText = `SCENE ${sceneId}/12`;
    ctx.fillStyle = '#737373';
    ctx.textAlign = 'right';
    ctx.fillText(sceneText, x + w - 175, chinY);

    // Scene title badge
    ctx.fillStyle = '#262626';
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 1;
    roundRect(ctx, x + w - 165, chinY - 10, 130, 20, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#67e8f9';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    const truncatedTitle =
      activeMeta.titleEn.length > 18 ? activeMeta.titleEn.substring(0, 16) + '..' : activeMeta.titleEn;
    ctx.fillText(truncatedTitle, x + w - 100, chinY);
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

    // Screw slot notch (rotated 45 deg)
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

  // Start the video recording process
  const startRecording = async () => {
    setErrorMessage(null);
    setVideoBlobUrl(null);
    recordedChunksRef.current = [];

    const oledCanvas = document.getElementById('oled-pixel-canvas') as HTMLCanvasElement;
    if (!oledCanvas) {
      setErrorMessage('Layar animasi belum siap atau tidak ditemukan. Mohon coba sesaat lagi.');
      return;
    }

    // Create offscreen composite canvas with target resolution (e.g. 3840x2400 for 4K UHD, 1920x1200 for Full HD)
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = resConfig.width;
    compositeCanvas.height = resConfig.height;
    compositeCanvasRef.current = compositeCanvas;

    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) {
      setErrorMessage('Browser tidak mendukung Canvas 2D context.');
      return;
    }

    // Auto setup for 1 Full Cycle
    if (recordMode === 'full_cycle') {
      onSceneChange(1);
      soundEngine.resetMelody();
      soundEngine.setEnabled(true);
      onPlayStateChange(true);
    }

    // Connect crystal-clear audio stream from soundEngine
    const audioStream = soundEngine.getAudioStream();
    const videoStream = compositeCanvas.captureStream(30);

    const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioStream.getAudioTracks());
    }

    const combinedStream = new MediaStream(combinedTracks);
    const mimeType = getSupportedMimeType();
    setVideoMimeType(mimeType);

    try {
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: resConfig.videoBitrate,
        audioBitsPerSecond: resConfig.audioBitrate,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: mimeType || 'video/webm',
        });
        const url = URL.createObjectURL(finalBlob);
        setVideoBlobUrl(url);
        setIsRecording(false);
        setRecordProgress(100);

        // Auto trigger download
        triggerDownload(url, mimeType, resConfig.badge);
      };

      // Continuous render loop into composite canvas at native resolution scale
      const renderLoop = () => {
        drawCompositeFrame(ctx, oledCanvas, currentSceneIdRef.current, resConfig.scale);
        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      };
      animFrameIdRef.current = requestAnimationFrame(renderLoop);

      // Start recording
      recorder.start(250);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      setRecordProgress(0);

      // Total expected cycle duration: 12 scenes * ~3.0s = 36 seconds
      const totalEstimatedSeconds = 36;

      // Timer & progress interval
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSeconds(sec);

        if (recordMode === 'full_cycle') {
          const progress = Math.min(99, Math.round((sec / totalEstimatedSeconds) * 100));
          setRecordProgress(progress);

          // If reached 38 seconds or user looped back, auto-stop recording
          if (sec >= totalEstimatedSeconds) {
            stopRecording();
          }
        }
      }, 500);
    } catch (err) {
      console.error('MediaRecorder error:', err);
      setErrorMessage(
        'Gagal memulai perekam video browser. Pastikan browser mendukung MediaRecorder atau coba gunakan Chrome/Edge.'
      );
      setIsRecording(false);
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
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
                  {resConfig.badge} • 4K & Full HD
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Kualitas video ultra tajam dengan suara jernih berkualitas studio 48kHz
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
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-mono font-bold tracking-wider text-rose-400 uppercase">
                    MEREKAM VIDEO {resConfig.badge}...
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-300 font-semibold">
                  {Math.floor(elapsedSeconds / 60)}:
                  {String(elapsedSeconds % 60).padStart(2, '0')} / ~0:36
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
                <span className="text-amber-400">{recordProgress}% Selesai</span>
              </div>

              <button
                onClick={stopRecording}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Selesai & Simpan Video Sekarang</span>
              </button>
            </div>
          )}

          {/* RECORDED RESULT PREVIEW */}
          {videoBlobUrl && !isRecording && (
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Video {resConfig.badge} Berhasil Dibuat!
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
                  <span>Download Video {resConfig.badge}</span>
                </button>

                <button
                  onClick={() => {
                    const recipientName = personalization.recipient || 'Azizah';
                    const text = encodeURIComponent(
                      `Halo ${recipientName}! Aku baru saja membuat animasi retro OLED romantis ${resConfig.badge} untukmu. Tonton di sini: ${window.location.href}`
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
              {/* Option 1: Resolution Selection (4K UHD & Full HD) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Pilihan Resolusi (Full HD & 4K Ultra HD):</span>
                  </label>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Music className="w-3 h-3 text-emerald-400" />
                    <span>Suara Jernih 48kHz</span>
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
                            Pilihan Utama
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
                            {res.id === '4k' ? '4K Ultra HD' : res.id === '1080p' ? 'Full HD 1080p' : 'HD Standar 720p'}
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
                  2. Ukuran & Cakupan Tampilan Video:
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
                        <span>Layar Penuh (Sesuai Gambar)</span>
                      </span>
                      {layout === 'full_screen' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-mono">
                          Pilihan Anda
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Mencakup seluruh tampilan layar lengkap: banner pesan cinta, modul OLED baut retro, tombol dock, dan copyright.
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
                      1 Siklus Lengkap (Scene 1 s/d 12)
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Otomatis mulai dari Scene 1, merekam seluruh cerita cinta sampai adegan hati, lalu otomatis download (~36 detik).
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
                  <span>Suara Jernih: 48kHz Studio Limiter (320 kbps)</span>
                </span>
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Resolusi: {resConfig.width}×{resConfig.height} ({resConfig.badge}) 30 FPS</span>
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
