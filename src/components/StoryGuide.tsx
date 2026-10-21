import React from 'react';
import { X, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { SCENES } from '../types';

interface StoryGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentSceneId: number;
  onSelectScene: (sceneId: number) => void;
}

export const StoryGuide: React.FC<StoryGuideProps> = ({
  isOpen,
  onClose,
  currentSceneId,
  onSelectScene,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-neutral-900 border border-neutral-700 rounded-3xl p-6 shadow-2xl text-neutral-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">12-Scene OLED Romantic Storyboard</h2>
              <p className="text-xs text-neutral-400">
                Click any scene to jump immediately to that point in the animation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 12 Scenes Grid */}
        <div className="mt-4 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SCENES.map((scene) => {
            const isActive = currentSceneId === scene.id;
            return (
              <div
                key={scene.id}
                onClick={() => {
                  onSelectScene(scene.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'bg-neutral-800/60 hover:bg-neutral-800 border-neutral-700/80 hover:border-neutral-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-700 text-neutral-300">
                      SCENE {scene.id}
                    </span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-500">
                        {scene.duration}s
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-neutral-100 line-clamp-1">
                    {scene.titleId}
                  </h3>
                  <h4 className="text-[11px] text-cyan-300/90 font-medium mb-1">
                    ({scene.titleEn})
                  </h4>

                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                    {scene.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-700/50 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 font-mono">Jump</span>
                  <Play className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400 fill-cyan-400' : 'text-neutral-400'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
