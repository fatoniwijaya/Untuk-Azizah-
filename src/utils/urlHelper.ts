import { PersonalizationData } from '../types';

export interface InitialStatePayload extends PersonalizationData {
  scene?: number;
  origin?: string;
}

/**
 * Safely decodes a URI component string without throwing on malformed inputs
 */
export function safeDecode(val: string | null): string {
  if (!val) return '';
  try {
    return decodeURIComponent(val.replace(/\+/g, ' ')).trim();
  } catch {
    return val.trim();
  }
}

export const DEFAULT_PERSONALIZATION: PersonalizationData = {
  recipient: 'Azizah',
  sender: 'Mr.Wijaya',
  customMessage: 'Untuk seseorang yang selalu spesial ❤️',
};

/**
 * Parses personalization and initial animation state from multiple resilient sources:
 * 1. Embedded server-side injected JSON (<script id="__INITIAL_LOVE_DATA__">)
 * 2. URL search parameters (?to=...&from=...&msg=...)
 * 3. URL hash parameters (#to=...&from=...&msg=...)
 * 4. LocalStorage cached data
 * 5. Default fallback to Azizah & Mr.Wijaya
 */
export function resolveInitialPersonalization(storageKey: string): {
  personalization: PersonalizationData;
  initialScene: number;
} {
  let recipient = '';
  let sender = '';
  let customMessage = '';
  let initialScene = 1;

  if (typeof window === 'undefined') {
    return {
      personalization: { ...DEFAULT_PERSONALIZATION },
      initialScene,
    };
  }

  // 1. Check embedded server-injected state (from Express server.ts)
  try {
    const embeddedElem = document.getElementById('__INITIAL_LOVE_DATA__');
    if (embeddedElem && embeddedElem.textContent) {
      const parsed: InitialStatePayload = JSON.parse(embeddedElem.textContent);
      if (parsed.recipient) recipient = parsed.recipient;
      if (parsed.sender) sender = parsed.sender;
      if (parsed.customMessage) customMessage = parsed.customMessage;
      if (parsed.scene && Number.isInteger(parsed.scene) && parsed.scene >= 1 && parsed.scene <= 12) {
        initialScene = parsed.scene;
      }
    }
  } catch (err) {
    console.warn('Could not parse __INITIAL_LOVE_DATA__ payload:', err);
  }

  // 2. Check URL Search Parameters (e.g., ?to=Azizah&from=Mr.Wijaya&msg=...)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const qTo = safeDecode(searchParams.get('to') || searchParams.get('recipient'));
    const qFrom = safeDecode(searchParams.get('from') || searchParams.get('sender'));
    const qMsg = safeDecode(searchParams.get('msg') || searchParams.get('message'));
    const qScene = searchParams.get('scene');

    if (qTo) recipient = qTo;
    if (qFrom) sender = qFrom;
    if (qMsg) customMessage = qMsg;
    if (qScene) {
      const parsedScene = parseInt(qScene, 10);
      if (!isNaN(parsedScene) && parsedScene >= 1 && parsedScene <= 12) {
        initialScene = parsedScene;
      }
    }
  } catch (err) {
    console.warn('Error reading URL search params:', err);
  }

  // 3. Fallback: Check Hash parameters (#to=...&from=... for mobile proxies)
  if (!recipient && !customMessage && window.location.hash.includes('=')) {
    try {
      const hashStr = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashStr);
      const hTo = safeDecode(hashParams.get('to'));
      const hFrom = safeDecode(hashParams.get('from'));
      const hMsg = safeDecode(hashParams.get('msg'));

      if (hTo) recipient = hTo;
      if (hFrom) sender = hFrom;
      if (hMsg) customMessage = hMsg;
    } catch (err) {
      console.warn('Error reading URL hash params:', err);
    }
  }

  // 4. Fallback to LocalStorage only if no URL or server data was passed
  if (!recipient && !sender && !customMessage) {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.recipient) recipient = parsed.recipient;
        if (parsed.sender) sender = parsed.sender;
        if (parsed.customMessage) customMessage = parsed.customMessage;
      }
    } catch {
      // storage disabled
    }
  }

  // 5. Default fallback to Gambar 1 (Azizah, Mr.Wijaya, Untuk seseorang yang selalu spesial ❤️)
  return {
    personalization: {
      recipient: recipient || DEFAULT_PERSONALIZATION.recipient,
      sender: sender || DEFAULT_PERSONALIZATION.sender,
      customMessage: customMessage || DEFAULT_PERSONALIZATION.customMessage,
    },
    initialScene,
  };
}

/**
 * Builds a clean, Open Graph-friendly URL structure with safe parameter encoding
 */
export function buildOpenGraphShareUrl(
  baseUrl: string,
  data: PersonalizationData,
  scene?: number,
  useProxyPath: boolean = false
): string {
  // Normalize base
  let cleanBase = baseUrl.trim().replace(/\/+$/, '');
  
  let targetUrl: URL;
  try {
    targetUrl = new URL(cleanBase);
  } catch {
    targetUrl = new URL(cleanBase, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  }

  // If proxy path is requested, ensure /share is used (except on GitHub Pages where static index.html is served)
  if (useProxyPath) {
    if ((!targetUrl.pathname || targetUrl.pathname === '/') && !targetUrl.hostname.includes('github.io')) {
      targetUrl.pathname = '/share';
    }
  }

  // Clean params
  targetUrl.search = '';
  if (data.recipient) targetUrl.searchParams.set('to', data.recipient);
  if (data.sender) targetUrl.searchParams.set('from', data.sender);
  if (data.customMessage) targetUrl.searchParams.set('msg', data.customMessage);
  if (scene && scene > 1) targetUrl.searchParams.set('scene', scene.toString());

  return targetUrl.toString();
}
