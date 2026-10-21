import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onReplay,
  onPrevious,
  onNext,
  canPrevious,
  canNext,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="w-full max-w-[760px] mx-auto mt-4 sm:mt-5 flex items-center justify-center font-mono">
      {/* Centered Controls Capsule */}
      <div className="inline-flex items-center justify-center gap-2 sm:gap-3 px-4 py-2.5 sm:px-6 sm:py-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl backdrop-blur-md shadow-xl">
        {/* Previous Scene Button */}
        <button
          onClick={onPrevious}
          disabled={!canPrevious}
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Previous Scene"
          aria-label="Previous Scene"
        >
          <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Play / Pause Button (Hero center button in Orange) */}
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-black font-bold shadow-[0_0_20px_rgba(255,138,0,0.4)] transition-all active:scale-95 cursor-pointer"
          title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-black" />
          ) : (
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black ml-0.5" />
          )}
        </button>

        {/* Next Scene Button */}
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Next Scene"
          aria-label="Next Scene"
        >
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Subtle Divider */}
        <div className="h-6 w-px bg-neutral-800 mx-0.5 sm:mx-1" />

        {/* Replay Button */}
        <button
          onClick={onReplay}
          className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-all active:scale-95 cursor-pointer shadow-sm"
          title="Replay from Beginning"
          aria-label="Replay"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Mic / Audio Toggle (Auto ON by default!) */}
        <button
          onClick={onToggleMute}
          className={`flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm ${
            !isMuted
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-500 border border-neutral-700/60'
          }`}
          title={!isMuted ? 'Audio On (Click to Mute)' : 'Audio Muted (Click to Unmute)'}
          aria-label={!isMuted ? 'Mute Audio' : 'Unmute Audio'}
        >
          {!isMuted ? (
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </div>
    </div>
  );
};
