import React, { useState } from 'react';
import { X, Heart, Sparkles, Check } from 'lucide-react';
import { PersonalizationData } from '../types';

interface PersonalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalization: PersonalizationData;
  onSave: (data: PersonalizationData) => void;
}

const PRESETS = [
  'Untuk Azizah Sayang yang selalu paling istimewa di hatiku ❤️',
  'I love you to the moon and stars 🌙✨',
  'Every pixel of my heart belongs to you 💕',
  'Terima kasih sudah selalu ada di sisiku, Azizah Sayang ❤️',
  'My favorite story is ours 💫',
];

export const PersonalizeModal: React.FC<PersonalizeModalProps> = ({
  isOpen,
  onClose,
  personalization,
  onSave,
}) => {
  const [recipient, setRecipient] = useState(personalization.recipient);
  const [sender, setSender] = useState(personalization.sender);
  const [customMessage, setCustomMessage] = useState(personalization.customMessage);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      recipient: recipient.trim().slice(0, 24),
      sender: sender.trim().slice(0, 24),
      customMessage: customMessage.trim().slice(0, 65),
    });
    onClose();
  };

  const handleClear = () => {
    setRecipient('Azizah Sayang ❤️');
    setSender('Mr.Wijaya');
    setCustomMessage('Untuk Azizah Sayang yang selalu paling istimewa di hatiku ❤️');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-3xl p-6 shadow-2xl text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-sans">Personalize Love Note</h2>
              <p className="text-xs text-neutral-400">Custom names & message appear on the OLED display</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleApply} className="mt-4 space-y-4 font-sans">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Recipient Name (To):
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Azizah / Sarah / Sayang"
              maxLength={24}
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Sender Name (From):
            </label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. Mr.Wijaya / Toni / Secret Admirer"
              maxLength={24}
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-neutral-300">
                Romantic Subtitle / Message:
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">
                {customMessage.length}/65
              </span>
            </div>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Untuk seseorang yang selalu spesial ❤️"
              maxLength={65}
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Preset Buttons */}
          <div>
            <span className="text-[11px] font-medium text-neutral-400 block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Quick romantic presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomMessage(p)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-[11px] text-neutral-300 border border-neutral-700/60 transition-colors text-left cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-neutral-800">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              Reset to Default
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Apply Note
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
