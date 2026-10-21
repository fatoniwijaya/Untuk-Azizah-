import React, { useState, useEffect, useRef } from 'react';
import { OledCanvas } from './components/OledCanvas';
import { Controls } from './components/Controls';
import { PersonalizeModal } from './components/PersonalizeModal';
import { ShareModal } from './components/ShareModal';
import { StoryGuide } from './components/StoryGuide';
import { VideoExportModal } from './components/VideoExportModal';
import { OledTheme, PersonalizationData, SCENES } from './types';
import { soundEngine } from './audio/soundEngine';
import { resolveInitialPersonalization } from './utils/urlHelper';
import { Heart, Share2, Video } from 'lucide-react';

const STORAGE_KEY = 'oled_love_personalization_v1';

// Initial resolution from server bootstrap script or query params
const initialResolution = resolveInitialPersonalization(STORAGE_KEY);

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [currentSceneId, setCurrentSceneId] = useState<number>(initialResolution.initialScene);
  const [isMuted, setIsMuted] = useState<boolean>(false); // Mic / Audio Auto ON
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Display style state: Green city background & Orange characters/text
  const [theme, setTheme] = useState<OledTheme>('amber');
  const [showScanlines, setShowScanlines] = useState<boolean>(true);
  const [showGlow, setShowGlow] = useState<boolean>(true);

  // Modals
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isStoryGuideOpen, setIsStoryGuideOpen] = useState<boolean>(false);
  const [isVideoExportOpen, setIsVideoExportOpen] = useState<boolean>(false);

  // Auto-enable audio on first interaction to comply with browser audio policies
  useEffect(() => {
    soundEngine.setEnabled(true);
    const unlockAudio = () => {
      soundEngine.initContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
  }, []);

  // Personalization state (loaded from server bootstrap JSON, URL, or LocalStorage)
  const [personalization, setPersonalization] = useState<PersonalizationData>(
    initialResolution.personalization
  );

  // Save to localStorage when changed
  const handleSavePersonalization = (data: PersonalizationData) => {
    setPersonalization(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  // Sync isPlaying to soundEngine romantic melody
  useEffect(() => {
    soundEngine.setPlaying(isPlaying);
  }, [isPlaying]);

  // Mute / Unmute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setEnabled(!nextMuted);
  };

  // Replay
  const handleReplay = () => {
    setCurrentSceneId(1);
    setIsPlaying(true);
    soundEngine.resetMelody();
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        handleReplay();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'ArrowRight') {
        setCurrentSceneId((prev) => Math.min(SCENES.length, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSceneId((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted]);

  const activeSceneMeta = SCENES[currentSceneId - 1] || SCENES[0];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#07090d] text-neutral-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black font-sans"
    >
      {/* TOP HEADER */}
      <header className="w-full border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-400 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(255,138,0,0.4)]">
              <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                <Heart className="w-4 h-4 fill-orange-400 text-orange-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white font-mono uppercase">
                  OLED Love Animation
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  12 Scenes
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden xs:block">
                Retro pixel-art romantic story with cityscape & heart transformation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsPersonalizeOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              <span className="max-w-[100px] sm:max-w-none truncate">
                {personalization.recipient ? `Untuk ${personalization.recipient}` : 'Personalisasi'}
              </span>
            </button>

            <button
              onClick={() => setIsVideoExportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/35 transition-colors cursor-pointer shadow-sm"
              title="Unduh video animasi Full HD 4K dengan suara jernih"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Unduh Video 4K</span>
            </button>

            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-black text-xs font-semibold shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-6 py-4 sm:py-6 md:py-8 flex flex-col items-center justify-center">
        {/* Recipient & Custom Message Banner Notice if configured */}
        {(personalization.recipient || personalization.customMessage) && (
          <div className="mb-3.5 w-full max-w-[760px] mx-auto px-3.5 sm:px-4 py-2.5 rounded-2xl bg-neutral-900/80 border border-neutral-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2.5 text-xs text-center">
            <div className="flex items-center justify-center gap-2 text-rose-300 w-full sm:w-auto text-center">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 animate-pulse" />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-center">
                {personalization.recipient && (
                  <span>
                    Untuk: <strong className="text-white font-semibold">{personalization.recipient}</strong>
                  </span>
                )}
                {personalization.sender && (
                  <span className="text-neutral-400">
                    • Dari: <strong className="text-neutral-200 font-semibold">{personalization.sender}</strong>
                  </span>
                )}
              </div>
            </div>

            {personalization.customMessage && (
              <div className="w-full sm:w-auto px-3 py-1 rounded-xl bg-neutral-800/90 border border-neutral-700 text-cyan-300 text-center font-medium text-[11px] sm:text-xs tracking-wide shadow-inner mx-auto sm:mx-0">
                "{personalization.customMessage}"
              </div>
            )}
          </div>
        )}

        {/* OLED SCREEN MODULE */}
        <OledCanvas
          isPlaying={isPlaying}
          onPlayStateChange={setIsPlaying}
          speed={speed}
          theme={theme}
          showScanlines={showScanlines}
          showGlow={showGlow}
          personalization={personalization}
          currentSceneId={currentSceneId}
          onSceneChange={setCurrentSceneId}
          isLooping={isLooping}
        />

        {/* CENTERED CONTROLS BAR */}
        <Controls
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onReplay={handleReplay}
          onPrevious={() => setCurrentSceneId((prev) => Math.max(1, prev - 1))}
          onNext={() => setCurrentSceneId((prev) => Math.min(SCENES.length, prev + 1))}
          canPrevious={currentSceneId > 1}
          canNext={currentSceneId < SCENES.length}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-neutral-900 py-4 px-6 text-center text-[11px] font-mono text-neutral-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 text-center">
          <span className="text-neutral-400 font-medium">Copyright 2026 @mr.wijaya</span>
          <div className="hidden sm:flex items-center gap-3 text-neutral-500">
            <span>Space: Play/Pause</span>
            <span>•</span>
            <span>R: Replay</span>
            <span>•</span>
            <span>M: Audio</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <PersonalizeModal
        isOpen={isPersonalizeOpen}
        onClose={() => setIsPersonalizeOpen(false)}
        personalization={personalization}
        onSave={handleSavePersonalization}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        personalization={personalization}
        onOpenVideoExport={() => setIsVideoExportOpen(true)}
      />

      <VideoExportModal
        isOpen={isVideoExportOpen}
        onClose={() => setIsVideoExportOpen(false)}
        currentSceneId={currentSceneId}
        onSceneChange={setCurrentSceneId}
        isPlaying={isPlaying}
        onPlayStateChange={setIsPlaying}
        personalization={personalization}
        isMuted={isMuted}
      />

      <StoryGuide
        isOpen={isStoryGuideOpen}
        onClose={() => setIsStoryGuideOpen(false)}
        currentSceneId={currentSceneId}
        onSelectScene={setCurrentSceneId}
      />
    </div>
  );
}
