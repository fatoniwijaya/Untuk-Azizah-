import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
  Globe,
  HelpCircle,
  ShieldCheck,
  Heart,
  Sparkles,
  Link as LinkIcon,
  Github,
  Video,
  Download,
  UploadCloud,
} from 'lucide-react';
import { PersonalizationData } from '../types';
import { buildOpenGraphShareUrl } from '../utils/urlHelper';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalization: PersonalizationData;
  onOpenVideoExport?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  personalization,
  onOpenVideoExport,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showDeploymentHelp, setShowDeploymentHelp] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [ghUsername, setGhUsername] = useState('fatoniwijaya');
  const [ghRepo, setGhRepo] = useState('Untuk-Azizah-');
  const [netlifyUrl, setNetlifyUrl] = useState('');
  const [urlMode, setUrlMode] = useState<'github' | 'netlify' | 'public' | 'custom'>('github');
  const [messageLanguage, setMessageLanguage] = useState<'id' | 'en'>('id');

  if (!isOpen) return null;

  // Resolve base URL: ALWAYS sanitize to public shared URL (-pre-), GitHub Pages, or custom domain
  // This completely eliminates the Google 403 error on phones (Gambar 2)!
  const getPublicBase = (): string => {
    // 1. If user is currently running this app directly on Netlify or custom domain:
    if (typeof window !== 'undefined' && (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('vercel.app'))) {
      return (window.location.origin + window.location.pathname).replace(/\/+$/, '');
    }

    // 2. If user is currently running this app directly on GitHub Pages:
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
      return (window.location.origin + window.location.pathname).replace(/\/+$/, '');
    }

    // 3. If Netlify Drop mode is selected:
    if (urlMode === 'netlify') {
      if (netlifyUrl.trim()) {
        const cleaned = netlifyUrl.trim().replace(/\/+$/, '');
        return cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
      }
      return 'https://cinta-retro-oled.netlify.app';
    }

    // 4. If GitHub Pages mode is selected:
    if (urlMode === 'github') {
      const user = ghUsername.trim() || 'fatoniwijaya';
      const repo = ghRepo.trim() ? `/${ghRepo.trim()}` : '';
      return `https://${user}.github.io${repo}`;
    }

    // 5. If Custom Domain mode is selected:
    if (urlMode === 'custom' && customBaseUrl.trim()) {
      return customBaseUrl.trim().replace(/\/+$/, '');
    }

    // 4. Default to Google AI Studio Public Shared URL (-pre-):
    const envShared =
      import.meta.env.VITE_SHARED_APP_URL ||
      'https://ais-pre-jouxx72jqohnjjwr3ummpa-250258514907.asia-southeast1.run.app';

    if (typeof window !== 'undefined') {
      const origin = window.location.origin;

      // If running on a custom domain (e.g. vercel.app, netlify.app, etc.), use it directly
      if (!origin.includes('google') && !origin.includes('run.app') && !origin.includes('localhost')) {
        return origin.replace(/\/+$/, '');
      }

      // If running inside AI Studio dev URL, ALWAYS convert -dev- to -pre-
      if (origin.includes('-dev-')) {
        return origin.replace('-dev-', '-pre-').replace(/\/+$/, '');
      }

      // If origin is aistudio.google.com or localhost, use public shared URL
      if (origin.includes('aistudio.google.com') || origin.includes('localhost')) {
        return envShared.replace(/\/+$/, '');
      }

      return origin.replace('-dev-', '-pre-').replace(/\/+$/, '');
    }

    return envShared.replace(/\/+$/, '');
  };

  const currentBase = getPublicBase();
  // Open Graph-friendly URL structure with dedicated /share proxy route
  const shareUrl = buildOpenGraphShareUrl(currentBase, personalization, undefined, true);

  // Dynamic Open Graph image preview URL
  const recipientName = personalization.recipient || 'Azizah';
  const senderName = personalization.sender || 'Mr.Wijaya';
  const customMsg = personalization.customMessage || 'Untuk seseorang yang selalu spesial ❤️';

  const ogPreviewImageUrl = `${currentBase}/api/og-image?to=${encodeURIComponent(
    recipientName
  )}&from=${encodeURIComponent(
    senderName
  )}&msg=${encodeURIComponent(customMsg)}`;

  const buildShareText = (): string => {
    if (messageLanguage === 'id') {
      let greeting = `Untuk ${recipientName} ❤️ Ada animasi cinta retro OLED spesial yang dibuatkan khusus untukmu!`;
      if (senderName) {
        greeting += ` (Dari: ${senderName})`;
      }
      if (customMsg) {
        greeting += `\n\n"${customMsg}"`;
      }
      // Ensure the URL is separated cleanly with newlines for WhatsApp link parsing
      return `${greeting}\n\nBuka langsung di sini:\n${shareUrl}\n`;
    } else {
      let greeting = `For ${recipientName} ❤️ A special retro OLED love story was crafted just for you!`;
      if (senderName) {
        greeting += ` (From: ${senderName})`;
      }
      if (customMsg) {
        greeting += `\n\n"${customMsg}"`;
      }
      return `${greeting}\n\nOpen it here:\n${shareUrl}\n`;
    }
  };

  const shareText = buildShareText();
  // WhatsApp click-to-chat link using wa.me which opens native WhatsApp app on Android & iOS directly
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Pesan Cinta untuk ${recipientName} ❤️`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // Cancelled
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl text-neutral-100 font-sans my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold">Share ke WhatsApp (Bebas 403)</h2>
              <p className="text-[11px] text-neutral-400">
                Pesan cinta & link Open Graph siap dibuka di HP
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

        {/* Content */}
        <div className="mt-3.5 space-y-3.5 text-xs">
          {/* Solusi Error 403 Alert Box */}
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Solusi Error 403 di HP Penerima:</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Google memblokir link versi developer (<code className="bg-black/40 px-1 rounded text-cyan-300 font-mono">-dev-</code>) untuk orang lain sehingga muncul <strong className="text-white">Error 403 Access Denied</strong>. Link di bawah ini sudah otomatis diubah ke versi Publik (<code className="bg-black/40 px-1 rounded text-emerald-300 font-mono">-pre-</code>) yang aman dibuka di HP penerima.
            </p>
          </div>

          {/* Open Graph Preview Card (How it appears in WhatsApp) */}
          <div className="rounded-xl sm:rounded-2xl bg-neutral-950 border border-cyan-500/30 overflow-hidden shadow-lg">
            <div className="px-3 py-1.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
              <span className="flex items-center gap-1.5 font-medium text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Preview Card WhatsApp:
              </span>
              <span className="font-mono text-[10px] text-neutral-500">Auto Open Graph</span>
            </div>
            <div className="p-3 flex gap-3 items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black border border-cyan-500/40 shrink-0 overflow-hidden flex items-center justify-center relative">
                <img
                  src={ogPreviewImageUrl}
                  alt="Open Graph preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/og-card.svg';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-semibold text-white truncate">
                  Spesial Untuk {recipientName} ❤️
                </div>
                <div className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                  "{customMsg}"
                </div>
                <div className="text-[10px] text-cyan-400 font-mono truncate">
                  {new URL(shareUrl).host}
                </div>
              </div>
            </div>
          </div>

          {/* URL Origin Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Pilihan Domain Link (Agar Bebas 403 di HP):
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-neutral-800/80 rounded-xl border border-neutral-700 text-[11px]">
              <button
                type="button"
                onClick={() => setUrlMode('netlify')}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center truncate flex items-center justify-center gap-1.5 ${
                  urlMode === 'netlify'
                    ? 'bg-emerald-500 text-black shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5 shrink-0" />
                <span>Netlify Drop (Instan)</span>
              </button>
              <button
                type="button"
                onClick={() => setUrlMode('github')}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center truncate flex items-center justify-center gap-1.5 ${
                  urlMode === 'github'
                    ? 'bg-cyan-500 text-black shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Github className="w-3.5 h-3.5 shrink-0" />
                <span>GitHub Pages</span>
              </button>
              <button
                type="button"
                onClick={() => setUrlMode('public')}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center truncate ${
                  urlMode === 'public'
                    ? 'bg-cyan-500 text-black shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                AI Studio (-pre-)
              </button>
              <button
                type="button"
                onClick={() => setUrlMode('custom')}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center truncate ${
                  urlMode === 'custom'
                    ? 'bg-cyan-500 text-black shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Domain Sendiri
              </button>
            </div>

            {urlMode === 'netlify' && (
              <div className="mt-2 p-3 rounded-xl bg-gradient-to-br from-emerald-950/50 via-neutral-900 to-black border border-emerald-500/40 animate-in fade-in duration-150 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Deploy 1-Klik Terima Beres (Tanpa Terminal / Akun)
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Bebas 403
                  </span>
                </div>

                <div className="text-[11px] text-neutral-300 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Unduh arsip web siap pakai:</span>
                  </div>
                  <div className="pl-5">
                    <a
                      href="/dist-ready-to-deploy.zip"
                      download="dist-ready-to-deploy.zip"
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh dist-ready-to-deploy.zip (7.5 MB)</span>
                    </a>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-300 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Buka Netlify Drop lalu seret/upload file zip tersebut:</span>
                  </div>
                  <div className="pl-5">
                    <a
                      href="https://app.netlify.com/drop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-xs border border-neutral-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka app.netlify.com/drop</span>
                    </a>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-300 space-y-1 pt-1 border-t border-neutral-800">
                  <div className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span>Tempel (paste) link Netlify yang kamu dapat di sini:</span>
                  </div>
                  <div className="pl-5">
                    <input
                      type="text"
                      placeholder="https://kisah-cinta-azizah.netlify.app"
                      value={netlifyUrl}
                      onChange={(e) => setNetlifyUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-emerald-500/40 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {urlMode === 'github' && (
              <div className="mt-2 p-2.5 rounded-xl bg-neutral-800/60 border border-cyan-500/30 animate-in fade-in duration-150 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-0.5">GitHub Username:</label>
                    <input
                      type="text"
                      placeholder="fatoniwijaya"
                      value={ghUsername}
                      onChange={(e) => setGhUsername(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-0.5">Repository Name:</label>
                    <input
                      type="text"
                      placeholder="oled-love"
                      value={ghRepo}
                      onChange={(e) => setGhRepo(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-neutral-300 leading-relaxed bg-black/40 p-2 rounded-lg border border-neutral-800">
                  <span className="text-emerald-400 font-semibold block mb-0.5">✓ Rekomendasi GitHub (Bisa Dibuka di Semua HP):</span>
                  Workflow otomatis <code className="text-cyan-300 font-mono">.github/workflows/deploy.yml</code> sudah siap di project ini. Cukup hubungkan repo Anda & aktifkan GitHub Actions di tab Settings Pages!
                </div>
              </div>
            )}

            {urlMode === 'custom' && (
              <div className="mt-2 animate-in fade-in duration-150 space-y-1">
                <input
                  type="text"
                  placeholder="https://cinta-azizah.vercel.app"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  className="w-full px-3.5 py-1.5 rounded-xl bg-neutral-800 border border-cyan-500/50 text-xs font-mono text-cyan-200 focus:outline-none"
                />
                <span className="text-[10px] text-neutral-400 block">
                  Masukkan domain website kamu di Vercel, Cloudflare, atau domain pribadi.
                </span>
              </div>
            )}

            {urlMode === 'public' && (
              <div className="mt-2 p-2 rounded-xl bg-neutral-800/40 border border-neutral-700 text-[10px] text-neutral-400 animate-in fade-in duration-150">
                Link publik resmi AI Studio (<code className="text-emerald-300 font-mono">-pre-</code>). Pastikan tombol <strong>Share/Publish</strong> di kanan atas AI Studio sudah pernah diklik agar link ini aktif.
              </div>
            )}
          </div>

          {/* Language Toggle for WhatsApp greeting */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium">Bahasa Pesan:</span>
            <div className="inline-flex rounded-xl bg-neutral-800 p-0.5 border border-neutral-700">
              <button
                type="button"
                onClick={() => setMessageLanguage('id')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  messageLanguage === 'id'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🇮🇩 Indonesia
              </button>
              <button
                type="button"
                onClick={() => setMessageLanguage('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  messageLanguage === 'en'
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Share Preview Card */}
          <div className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Isi Pesan WhatsApp:</span>
              </div>
              <button
                onClick={handleCopyFullMessage}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Salin Teks
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-200 whitespace-pre-wrap select-all max-h-24 overflow-y-auto leading-relaxed">
              {shareText}
            </div>
          </div>

          {/* Share Link Field */}
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1">
              Link Langsung Siap Dikirim:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-[11px] font-mono text-cyan-300 truncate focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Salin Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            {/* Direct WhatsApp link */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-transform active:scale-95 cursor-pointer text-center"
            >
              <MessageSquare className="w-4 h-4 fill-black" />
              <span>Buka & Kirim WhatsApp</span>
            </a>

            {/* Test Link Button */}
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-cyan-300 font-semibold text-xs sm:text-sm border border-neutral-700 transition-colors cursor-pointer text-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Uji Link</span>
            </a>
          </div>

          {/* Download Video Shortcut */}
          {onOpenVideoExport && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-white block">
                    Kirim Berupa File Video (MP4 / WebM)
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Rekam seluruh animasi layar penuh + musik romantis
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVideoExport();
                }}
                className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-sm"
              >
                Unduh Video
              </button>
            </div>
          )}

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-700/80 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Menu Bagikan Bawaan HP (WhatsApp, Instagram, Telegram)</span>
            </button>
          )}

          {/* Educational Note */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowDeploymentHelp(!showDeploymentHelp)}
              className="text-xs text-neutral-400 hover:text-cyan-400 inline-flex items-center gap-1 underline transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showDeploymentHelp
                ? 'Tutup panduan deployment'
                : 'Panduan Deploy ke GitHub Pages / Vercel (Bebas Error 403)'}
            </button>

            {showDeploymentHelp && (
              <div className="mt-2.5 p-3 rounded-xl bg-neutral-800/80 border border-neutral-700 text-left text-xs text-neutral-300 space-y-2.5 animate-in fade-in duration-150">
                <p>
                  <strong>Mengapa Muncul Error 403 di HP?</strong> Link berawalan <code className="text-rose-300 font-mono">-dev-</code> adalah editor pribadi AI Studio Anda. Gunakan link berawalan <code className="text-emerald-300 font-mono">-pre-</code> di atas agar bisa dibuka oleh siapa saja tanpa akun developer.
                </p>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 font-mono text-[11px]">
                  <div className="text-emerald-400 font-bold">🚀 Deploy ke GitHub Pages (Otomatis):</div>
                  <div className="text-neutral-400 text-[10px]">File workflow GitHub Actions (.github/workflows/deploy.yml) sudah terpasang. Cukup hubungkan repo:</div>
                  <code className="block text-cyan-300 select-all bg-black/60 p-2 rounded text-[10px] break-all">
                    git remote add origin https://github.com/USERNAME/REPO.git<br/>
                    git push -u origin main
                  </code>
                  <div className="text-neutral-400 text-[10px]">Di GitHub: Settings &rarr; Pages &rarr; Source: <strong>GitHub Actions</strong>. Web akan otomatis online!</div>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1 font-mono text-[11px]">
                  <div className="text-cyan-400 font-bold">⚡ Deploy Instan via Vercel / Netlify:</div>
                  <div className="text-neutral-400 text-[10px]">Drag & drop folder <code className="text-cyan-300">dist</code> langsung ke dashboard Vercel / Netlify Drop.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

