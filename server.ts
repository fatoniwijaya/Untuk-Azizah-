import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Escape HTML special characters for safe attribute and title injection
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate dynamic SVG social share card
function generateOgSvg(to: string, from: string, msg: string): string {
  const safeTo = escapeHtml(to ? to.toUpperCase() : 'AZIZAH');
  const safeFrom = escapeHtml(from ? from.toUpperCase() : 'MR.WIJAYA');
  const safeMsg = escapeHtml(msg || 'UNTUK SESEORANG YANG SELALU SPESIAL ❤️');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020408" />
      <stop offset="60%" stop-color="#060c14" />
      <stop offset="100%" stop-color="#010204" />
    </linearGradient>
    <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="pinkGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Hardware Frame -->
  <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="#00F0FF" stroke-width="2.5" opacity="0.4" />
  <rect x="36" y="36" width="1128" height="558" rx="20" fill="none" stroke="#00F0FF" stroke-width="1.2" opacity="0.8" filter="url(#cyanGlow)" />

  <!-- Status Bar -->
  <g transform="translate(64, 68)">
    <rect x="0" y="0" width="1072" height="38" rx="8" fill="#00F0FF" fill-opacity="0.05" stroke="#00F0FF" stroke-opacity="0.2" stroke-width="1" />
    <circle cx="20" cy="19" r="5" fill="#00FF66" filter="url(#cyanGlow)" />
    <text x="36" y="24" font-family="'JetBrains Mono', monospace, 'Courier New'" font-size="14" font-weight="700" fill="#00F0FF" letter-spacing="2">OLED-SSD1306 // 128x64 RETRO LOVE STORY</text>
    <text x="1052" y="24" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="500" fill="#FF4477" letter-spacing="1">WHATSAPP SPECIAL PREVIEW</text>
  </g>

  <!-- Big Glowing Pixel Heart -->
  <g transform="translate(600, 230) scale(4)" filter="url(#pinkGlow)">
    <g fill="#FF2E63">
      <rect x="-6" y="-6" width="4" height="2" />
      <rect x="2" y="-6" width="4" height="2" />
      <rect x="-8" y="-4" width="7" height="2" />
      <rect x="1" y="-4" width="7" height="2" />
      <rect x="-9" y="-2" width="18" height="4" />
      <rect x="-8" y="2" width="16" height="2" />
      <rect x="-6" y="4" width="12" height="2" />
      <rect x="-4" y="6" width="8" height="2" />
      <rect x="-2" y="8" width="4" height="2" />
    </g>
    <rect x="-6" y="-4" width="2" height="2" fill="#FFFFFF" opacity="0.9" />
  </g>

  <!-- Title & Dedication -->
  <text x="600" y="160" text-anchor="middle" font-family="'Cinzel', 'Times New Roman', Georgia, serif" font-size="42" font-weight="700" fill="#FFFFFF" letter-spacing="3">
    ${to ? `UNTUK ${safeTo} ❤️` : 'Kisah Cinta Retro OLED'}
  </text>
  
  <text x="600" y="360" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="20" font-weight="700" fill="#00F0FF" letter-spacing="3" filter="url(#cyanGlow)">
    ${from ? `DARI: ${safeFrom}` : 'DEDICATED WITH LOVE'}
  </text>

  <!-- Custom Message Box -->
  <g transform="translate(180, 400)">
    <rect x="0" y="0" width="840" height="90" rx="16" fill="#000000" fill-opacity="0.9" stroke="#00F0FF" stroke-width="1.8" filter="url(#cyanGlow)" />
    <text x="420" y="42" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="22" font-weight="700" fill="#FFFFFF" letter-spacing="0.5">
      "${safeMsg.slice(0, 56)}${safeMsg.length > 56 ? '...' : ''}"
    </text>
    <text x="420" y="72" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="14" font-weight="500" fill="#00F0FF" letter-spacing="1">
      ▶ KLIK UNTUK MEMUTAR ANIMASI CINTA RETRO 12 BABAK
    </text>
  </g>

  <!-- Ground Line -->
  <rect x="64" y="550" width="1072" height="4" fill="#00F0FF" opacity="0.6" />
</svg>`;
}

// Injects dynamic Open Graph, Twitter cards, and bootstrap payload into HTML
function injectOpenGraphTags(
  html: string,
  req: Request
): string {
  const to = typeof req.query.to === 'string' && req.query.to.trim() ? req.query.to.trim() : 'Azizah';
  const from = typeof req.query.from === 'string' && req.query.from.trim() ? req.query.from.trim() : 'Mr.Wijaya';
  const msg = typeof req.query.msg === 'string' && req.query.msg.trim() ? req.query.msg.trim() : 'Untuk seseorang yang selalu spesial ❤️';
  const scene = typeof req.query.scene === 'string' ? req.query.scene.trim() : '';

  // Determine host and protocol
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  const proto = req.get('x-forwarded-proto') || 'https';
  let origin = `${proto}://${host}`;

  // Ensure public links and Open Graph previews never point to restricted -dev- or aistudio.google.com
  const rawAppUrl = process.env.APP_URL || '';
  const publicSharedUrl = rawAppUrl.replace('-dev-', '-pre-');
  let publicOrigin = origin.replace('-dev-', '-pre-');
  if ((publicOrigin.includes('localhost') || publicOrigin.includes('aistudio.google.com')) && publicSharedUrl) {
    publicOrigin = publicSharedUrl;
  }

  const canonicalUrl = `${publicOrigin}${req.originalUrl}`;

  // Build personalized titles and descriptions (defaulting to Azizah & Mr.Wijaya)
  let pageTitle = `Pesan Cinta Retro OLED untuk ${to} ❤️ dari ${from}`;
  let ogTitle = `Spesial untuk ${to} ❤️ Dari ${from}`;
  let ogDesc = msg
    ? `"${msg}" — Tonton animasi cinta retro OLED khusus untukmu.`
    : `${from} mengirimkan animasi cinta retro OLED 12 babak khusus untukmu. Buka sekarang!`;

  // Dynamic social card image URL
  const ogImageUrl = `${publicOrigin}/api/og-image?to=${encodeURIComponent(to)}&from=${encodeURIComponent(from)}&msg=${encodeURIComponent(msg)}`;

  // Safe serialized bootstrap data for client
  const bootstrapPayload = JSON.stringify({
    recipient: to,
    sender: from,
    customMessage: msg,
    scene: scene ? parseInt(scene, 10) : 1,
    origin: publicOrigin,
  });

  const injectedMeta = `
    <!-- Dynamic Open Graph & WhatsApp Metadata -->
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(ogDesc)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Retro OLED Love Story" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDesc)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/svg+xml" />
    
    <!-- Twitter / X Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />

    <!-- Schema.org WebApplication JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "OLED Love Animation",
      "applicationCategory": "EntertainmentApplication",
      "description": "${escapeHtml(ogDesc)}",
      "url": "${escapeHtml(canonicalUrl)}"
    }
    </script>

    <!-- Embedded Bootstrap State to ensure mobile WhatsApp browser never drops params -->
    <script id="__INITIAL_LOVE_DATA__" type="application/json">${bootstrapPayload}</script>
  `;

  // Strip pre-existing static meta tags and replace title
  let modified = html
    .replace(/<title>.*?<\/title>/is, '')
    .replace(/<meta\s+name="description".*?>/is, '')
    .replace(/<meta\s+property="og:title".*?>/is, '')
    .replace(/<meta\s+property="og:description".*?>/is, '')
    .replace(/<meta\s+property="og:type".*?>/is, '')
    .replace(/<meta\s+name="twitter:card".*?>/is, '');

  // Insert newly constructed meta tags right before </head>
  return modified.replace('</head>', `${injectedMeta}\n</head>`);
}

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Dynamic Open Graph Image Route
  app.get('/api/og-image', (req: Request, res: Response) => {
    const to = typeof req.query.to === 'string' && req.query.to.trim() ? req.query.to.trim() : 'Azizah';
    const from = typeof req.query.from === 'string' && req.query.from.trim() ? req.query.from.trim() : 'Mr.Wijaya';
    const msg = typeof req.query.msg === 'string' && req.query.msg.trim() ? req.query.msg.trim() : 'Untuk seseorang yang selalu spesial ❤️';

    const svg = generateOgSvg(to, from, msg);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  });

  // Healthcheck endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'oled-love-server', timestamp: Date.now() });
  });

  // Dedicated Landing & Share Proxy Handler
  const handleLandingPage = async (
    req: Request,
    res: Response,
    viteInstance?: any
  ) => {
    try {
      let template: string;
      if (!isProduction && viteInstance) {
        const indexHtmlPath = path.resolve(__dirname, 'index.html');
        template = fs.readFileSync(indexHtmlPath, 'utf-8');
        template = await viteInstance.transformIndexHtml(req.originalUrl, template);
      } else {
        const distHtmlPath = path.resolve(__dirname, 'dist', 'index.html');
        if (fs.existsSync(distHtmlPath)) {
          template = fs.readFileSync(distHtmlPath, 'utf-8');
        } else {
          // Fallback to root index.html if dist not yet built
          template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        }
      }

      const injectedHtml = injectOpenGraphTags(template, req);
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(injectedHtml);
    } catch (err) {
      console.error('Error rendering HTML page:', err);
      res.status(500).send('Internal Server Error');
    }
  };

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    // Mount Vite middleware for HMR, assets, and source transformation
    app.use(vite.middlewares);

    // Explicit landing routes for WhatsApp & social sharing
    app.get('/', (req, res) => handleLandingPage(req, res, vite));
    app.get('/share', (req, res) => handleLandingPage(req, res, vite));
    app.get('/s', (req, res) => handleLandingPage(req, res, vite));
    app.get('/love', (req, res) => handleLandingPage(req, res, vite));

    // Fallback for any client SPA navigation
    app.use('*', (req, res) => handleLandingPage(req, res, vite));
  } else {
    // Production: serve static assets from dist
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false }));

    app.get('/', (req, res) => handleLandingPage(req, res));
    app.get('/share', (req, res) => handleLandingPage(req, res));
    app.get('/s', (req, res) => handleLandingPage(req, res));
    app.get('/love', (req, res) => handleLandingPage(req, res));

    app.use('*', (req, res) => handleLandingPage(req, res));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OLED Love server listening on port ${PORT} (isProduction=${isProduction})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
