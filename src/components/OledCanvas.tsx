import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PixelRenderer, LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../pixel/renderer';
import { SCENES, OledTheme, PersonalizationData } from '../types';
import { soundEngine } from '../audio/soundEngine';

interface OledCanvasProps {
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  speed: number;
  theme: OledTheme;
  showScanlines: boolean;
  showGlow: boolean;
  personalization: PersonalizationData;
  currentSceneId: number;
  onSceneChange: (sceneId: number) => void;
  isLooping: boolean;
}

interface ThemeConfig {
  skyline: string;
  character: string;
  glow: string;
  border: string;
}

const THEME_COLORS: Record<OledTheme, ThemeConfig> = {
  amber: {
    skyline: '#22c55e',
    character: '#FF8A00',
    glow: 'rgba(255, 138, 0, 0.45)',
    border: 'border-orange-500/80 shadow-[0_0_30px_rgba(255,138,0,0.45)]',
  },
  emerald: {
    skyline: '#22c55e',
    character: '#4EFE95',
    glow: 'rgba(50, 255, 120, 0.4)',
    border: 'border-emerald-500/70 shadow-[0_0_25px_rgba(50,255,120,0.45)]',
  },
  cyan: {
    skyline: '#22c55e',
    character: '#FF8A00',
    glow: 'rgba(255, 138, 0, 0.4)',
    border: 'border-orange-500/80 shadow-[0_0_28px_rgba(255,138,0,0.4)]',
  },
  white: {
    skyline: '#22c55e',
    character: '#FFFFFF',
    glow: 'rgba(255, 255, 255, 0.3)',
    border: 'border-neutral-300/70 shadow-[0_0_22px_rgba(255,255,255,0.4)]',
  },
};

export const OledCanvas: React.FC<OledCanvasProps> = ({
  isPlaying,
  onPlayStateChange,
  speed,
  theme,
  showScanlines,
  showGlow,
  personalization,
  currentSceneId,
  onSceneChange,
  isLooping,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelRenderer | null>(null);

  // Animation timeline state
  const animStateRef = useRef({
    currentSceneIdx: currentSceneId - 1,
    sceneTime: 0,
    totalTime: 0,
    lastFrameTimestamp: 0,
    isPlaying: isPlaying,
    speed: speed,
    lastBeatTime: 0,
    lastFootstepStep: -1,
  });

  // Sync prop changes into ref to avoid restarting requestAnimationFrame loop
  useEffect(() => {
    animStateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    animStateRef.current.speed = speed;
  }, [speed]);

  // Sync external scene changes
  useEffect(() => {
    if (animStateRef.current.currentSceneIdx !== currentSceneId - 1) {
      animStateRef.current.currentSceneIdx = currentSceneId - 1;
      animStateRef.current.sceneTime = 0;
      rendererRef.current?.clearParticles();
      triggerSceneSound(currentSceneId);
    }
  }, [currentSceneId]);

  // Sound triggers per scene change
  const triggerSceneSound = useCallback((sceneId: number) => {
    if (sceneId === 3) soundEngine.playMeeting();
    else if (sceneId === 4) soundEngine.playHug();
    else if (sceneId === 6) soundEngine.playSparkle();
    else if (sceneId === 7) soundEngine.playHeartAppear();
    else if (sceneId === 9) soundEngine.playRevealFanfare();
  }, []);

  // Set up high-DPI canvas & start animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Crisp pixel art settings
    ctx.imageSmoothingEnabled = false;
    rendererRef.current = new PixelRenderer(ctx);

    let animationFrameId: number;

    const loop = (timestamp: number) => {
      if (!animStateRef.current.lastFrameTimestamp) {
        animStateRef.current.lastFrameTimestamp = timestamp;
      }
      const rawDelta = (timestamp - animStateRef.current.lastFrameTimestamp) / 1000;
      animStateRef.current.lastFrameTimestamp = timestamp;

      // Clamp delta to prevent crazy leaps when tab regains focus
      const dt = Math.min(rawDelta, 0.1) * animStateRef.current.speed;

      if (animStateRef.current.isPlaying) {
        animStateRef.current.sceneTime += dt;
        animStateRef.current.totalTime += dt;

        const currentScene = SCENES[animStateRef.current.currentSceneIdx];
        const sceneDuration = currentScene.duration;

        // Check if scene finished
        if (animStateRef.current.sceneTime >= sceneDuration) {
          if (animStateRef.current.currentSceneIdx < SCENES.length - 1) {
            animStateRef.current.currentSceneIdx += 1;
            animStateRef.current.sceneTime = 0;
            const newSceneId = animStateRef.current.currentSceneIdx + 1;
            onSceneChange(newSceneId);
            triggerSceneSound(newSceneId);
          } else if (isLooping) {
            // Loop back to Scene 1
            animStateRef.current.currentSceneIdx = 0;
            animStateRef.current.sceneTime = 0;
            rendererRef.current?.clearParticles();
            soundEngine.resetMelody();
            onSceneChange(1);
          } else {
            // Pause at the end
            animStateRef.current.isPlaying = false;
            onPlayStateChange(false);
          }
        }

        // Sound triggers during timeline
        const sIdx = animStateRef.current.currentSceneIdx + 1;
        const sTime = animStateRef.current.sceneTime;

        // Footsteps in scenes 1 and 2
        if (sIdx === 1 || sIdx === 2) {
          const stepIndex = Math.floor(animStateRef.current.totalTime * 3.5);
          if (stepIndex !== animStateRef.current.lastFootstepStep) {
            animStateRef.current.lastFootstepStep = stepIndex;
            soundEngine.playFootstep();
          }
        }

        // Heartbeat in scenes 10, 11, 12
        if (sIdx >= 10) {
          if (timestamp - animStateRef.current.lastBeatTime > 900) {
            animStateRef.current.lastBeatTime = timestamp;
            soundEngine.playHeartbeat();
          }
        }
      }

      // Render the current scene
      const sceneId = animStateRef.current.currentSceneIdx + 1;
      const currentDuration = SCENES[animStateRef.current.currentSceneIdx]?.duration || 3;
      const progress = Math.min(1, animStateRef.current.sceneTime / currentDuration);

      if (rendererRef.current) {
        rendererRef.current.renderScene(
          sceneId,
          progress,
          animStateRef.current.totalTime,
          themeStyle.character,
          personalization,
          themeStyle.skyline,
          themeStyle.character
        );
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, personalization, isLooping, onSceneChange, onPlayStateChange, triggerSceneSound]);

  const themeStyle = THEME_COLORS[theme];

  return (
    <div className="relative w-full max-w-[760px] mx-auto flex flex-col items-center justify-center select-none">
      {/* RETRO OLED DISPLAY ENCLOSURE */}
      <div className="relative w-full p-2.5 sm:p-4 md:p-6 rounded-2xl sm:rounded-[28px] bg-gradient-to-b from-[#1c1f24] via-[#101216] to-[#07090b] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_1px_rgba(255,255,255,0.2)]">
        {/* CORNER MOUNTING SCREWS */}
        <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-neutral-800 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 sm:w-2 h-0.5 bg-neutral-400 rotate-45 rounded-sm" />
          <div className="w-0.5 h-1.5 sm:h-2 bg-neutral-400 -rotate-45 rounded-sm absolute" />
        </div>
        <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-neutral-800 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 sm:w-2 h-0.5 bg-neutral-400 -rotate-12 rounded-sm" />
          <div className="w-0.5 h-1.5 sm:h-2 bg-neutral-400 rotate-78 rounded-sm absolute" />
        </div>
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-neutral-800 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 sm:w-2 h-0.5 bg-neutral-400 rotate-30 rounded-sm" />
          <div className="w-0.5 h-1.5 sm:h-2 bg-neutral-400 -rotate-60 rounded-sm absolute" />
        </div>
        <div className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full bg-neutral-800 border border-neutral-600 shadow-inner flex items-center justify-center">
          <div className="w-1.5 sm:w-2 h-0.5 bg-neutral-400 -rotate-45 rounded-sm" />
          <div className="w-0.5 h-1.5 sm:h-2 bg-neutral-400 rotate-45 rounded-sm absolute" />
        </div>

        {/* OLED MODULE SILKSCREEN PINOUT HEADER */}
        <div className="flex items-center justify-between px-5 sm:px-7 pb-2 text-[8.5px] sm:text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-neutral-300 font-semibold text-[8.5px] sm:text-[10px]">OLED 128x64</span>
            <span className="text-neutral-600 hidden xs:inline">| 16:10 MATRIX</span>
          </div>
          <div className="text-[8px] sm:text-[10px] text-neutral-400 tracking-wider sm:tracking-widest font-mono">
            VCC • GND • SCL • SDA
          </div>
        </div>

        {/* INNER SCREEN BEZEL & ACTIVE OLED AREA */}
        <div
          className={`relative overflow-hidden rounded-xl bg-black border-2 transition-all duration-300 ${themeStyle.border} ${
            showGlow ? 'shadow-[0_0_35px_rgba(0,240,255,0.25)]' : ''
          }`}
          style={{ aspectRatio: '16 / 10' }}
        >
          {/* THE CANVAS */}
          <canvas
            ref={canvasRef}
            id="oled-pixel-canvas"
            width={LOGICAL_WIDTH}
            height={LOGICAL_HEIGHT}
            className="w-full h-full block pixelated"
            style={{
              imageRendering: 'pixelated',
            }}
          />

          {/* VINTAGE SCANLINES OVERLAY */}
          {showScanlines && (
            <div
              className="pointer-events-none absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0px, rgba(0, 0, 0, 0.6) 1px, transparent 1px, transparent 2px)',
                backgroundSize: '100% 2px',
              }}
            />
          )}

          {/* CRT / GLASS SPECULAR REFLECTION */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20 bg-gradient-to-tr from-transparent via-cyan-500/10 to-white/10"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* SUBTLE VIGNETTE */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.85)]" />
        </div>

        {/* LOWER BEZEL CHIN WITH RETRO PRODUCT MARK */}
        <div className="pt-2.5 px-2 sm:px-4 flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 font-bold tracking-wider text-[9px] sm:text-[11px]">RETRO-OLED</span>
            <span className="text-neutral-600 hidden xs:inline">•</span>
            <span className="text-neutral-500 hidden xs:inline text-[9px] sm:text-[10px]">12-SCENE ROMANCE</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-neutral-500 text-[9px] sm:text-[10px] whitespace-nowrap">
              SCENE {currentSceneId}/12
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[8px] sm:text-[9px] text-cyan-300 border border-neutral-700 max-w-[110px] sm:max-w-[150px] truncate">
              {SCENES[currentSceneId - 1]?.titleEn}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
