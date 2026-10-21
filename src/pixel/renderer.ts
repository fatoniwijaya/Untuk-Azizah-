// Canvas Pixel Rendering Engine for OLED 256x160 Display
import {
  MOON_BITMAP,
  STAR_CROSS,
  STAR_SMALL,
  HEART_NANO,
  HEART_MICRO,
  HEART_TINY,
  HEART_MEDIUM,
  HEART_LARGE_OUTLINE,
  BOY_WALK_1,
  BOY_WALK_2,
  BOY_WALK_3,
  BOY_STAND,
  GIRL_WALK_1,
  GIRL_WALK_2,
  GIRL_WALK_3,
  GIRL_STAND,
  HUG_FRAME_1,
  HUG_FRAME_2,
  BOLD_GLYPHS,
  PIXEL_FONT_5X7,
  PixelMatrix,
} from './bitmaps';
import { PersonalizationData } from '../types';

export const LOGICAL_WIDTH = 256;
export const LOGICAL_HEIGHT = 160;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
  type: 'pixel' | 'cross';
}

export interface HeartRainParticle {
  x: number;
  y: number;
  speedY: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  size: 'nano' | 'micro' | 'tiny';
  baseAlpha: number;
}

const SKY_STARS = [
  { x: 18, y: 16, type: 'cross', phase: 0 },
  { x: 48, y: 12, type: 'dot', phase: 1.2 },
  { x: 74, y: 22, type: 'dot', phase: 2.5 },
  { x: 96, y: 14, type: 'cross', phase: 0.8 },
  { x: 124, y: 18, type: 'dot', phase: 3.1 },
  { x: 148, y: 12, type: 'cross', phase: 1.7 },
  { x: 172, y: 24, type: 'dot', phase: 4.2 },
  { x: 196, y: 14, type: 'dot', phase: 0.4 },
  { x: 242, y: 24, type: 'cross', phase: 2.1 },
  { x: 36, y: 38, type: 'dot', phase: 3.6 },
  { x: 110, y: 36, type: 'cross', phase: 4.9 },
  { x: 160, y: 38, type: 'dot', phase: 1.1 },
  { x: 14, y: 52, type: 'dot', phase: 2.8 },
  { x: 238, y: 54, type: 'dot', phase: 0.9 },
  { x: 80, y: 46, type: 'cross', phase: 3.4 },
];

export class PixelRenderer {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private heartRainParticles: HeartRainParticle[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public drawMatrix(
    matrix: PixelMatrix,
    startX: number,
    startY: number,
    color: string = '#FFFFFF',
    scale: number = 1,
    alpha: number = 1
  ) {
    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = prevAlpha * alpha;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const val = matrix[r][c];
        if (val === 1) {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(
            Math.round(startX + c * scale),
            Math.round(startY + r * scale),
            Math.ceil(scale),
            Math.ceil(scale)
          );
        } else if (val === 2) {
          // Solid black cutout/interior (makes foreground characters opaque over background buildings)
          this.ctx.fillStyle = '#010307';
          this.ctx.fillRect(
            Math.round(startX + c * scale),
            Math.round(startY + r * scale),
            Math.ceil(scale),
            Math.ceil(scale)
          );
        }
      }
    }
    this.ctx.globalAlpha = prevAlpha;
  }

  public normalizePixelText(text: string): string {
    if (!text) return '';
    return text
      // Replace heart emojis & patterns with ♥
      .replace(/❤️|❤|💕|💖|💗|💓|💘|<3/gi, '♥')
      // Replace star emojis with ★
      .replace(/✨|⭐|💫|🌟/g, '★')
      // Replace moon emojis with ☾
      .replace(/🌙/g, '☾')
      // Remove invisible variation selectors and joiners
      .replace(/[\uFE00-\uFE0F\u200D\u200B]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public wrapText(text: string, maxCharsPerLine: number = 24): string[] {
    const normalized = this.normalizePixelText(text);
    if (!normalized) return [];
    const words = normalized.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else {
        const candidate = `${currentLine} ${word}`;
        if (Array.from(candidate).length <= maxCharsPerLine) {
          currentLine = candidate;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  public draw5x7Text(
    text: string,
    x: number,
    y: number,
    color: string = '#FFFFFF',
    scale: number = 1,
    alpha: number = 1,
    withBackdrop: boolean = false
  ) {
    const normalized = this.normalizePixelText(text);
    if (!normalized) return;

    const prevAlpha = this.ctx.globalAlpha;
    const totalWidth = this.measure5x7Text(normalized, scale);

    // High-contrast OLED cutout backdrop so text never blends into background buildings or stars
    if (withBackdrop) {
      this.ctx.globalAlpha = 0.98;
      this.ctx.fillStyle = '#010307';
      this.ctx.fillRect(
        Math.round(x - 3 * scale),
        Math.round(y - 2 * scale),
        Math.round(totalWidth + 6 * scale),
        Math.round(10 * scale)
      );
    }

    this.ctx.globalAlpha = prevAlpha * alpha;
    this.ctx.fillStyle = color;

    let cursorX = x;
    const chars = Array.from(normalized);

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      // Keep special symbols as-is, uppercase latin characters
      const lookupChar =
        char === '♥' || char === '•' || char === '★' || char === '☾' || char === '❤'
          ? char
          : char.toUpperCase();

      const glyph = PIXEL_FONT_5X7[lookupChar] || PIXEL_FONT_5X7[' '];

      for (let col = 0; col < 5; col++) {
        const bits = glyph[col];
        for (let row = 0; row < 7; row++) {
          if ((bits >> row) & 1) {
            this.ctx.fillRect(
              Math.round(cursorX + col * scale),
              Math.round(y + row * scale),
              scale,
              scale
            );
          }
        }
      }
      cursorX += 6 * scale;
    }
    this.ctx.globalAlpha = prevAlpha;
  }

  public measure5x7Text(text: string, scale: number = 1): number {
    const normalized = this.normalizePixelText(text);
    return Array.from(normalized).length * 6 * scale;
  }

  public drawILoveYouText(
    centerX: number,
    centerY: number,
    color: string = '#FFFFFF',
    scale: number = 2,
    alpha: number = 1
  ) {
    const words = ['I', 'LOVE', 'YOU'];
    const letterWidth = 6 * scale;
    const letterSpacing = 2 * scale;
    const wordSpacing = 7 * scale;

    const totalWidth =
      letterWidth * 8 + letterSpacing * 5 + wordSpacing * 2;
    let cursorX = Math.round(centerX - totalWidth / 2);

    words.forEach((word, wordIdx) => {
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const matrix = BOLD_GLYPHS[char];
        if (matrix) {
          this.drawMatrix(matrix, cursorX, centerY, color, scale, alpha);
        }
        cursorX += letterWidth + letterSpacing;
      }
      if (wordIdx < words.length - 1) {
        cursorX += wordSpacing - letterSpacing;
      }
    });
  }

  public drawNightSky(time: number, color: string = '#FFFFFF') {
    this.ctx.fillStyle = '#010307';
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Crescent Moon at top-right
    this.drawMatrix(MOON_BITMAP, 224, 14, color, 1);

    // Stars
    SKY_STARS.forEach((star) => {
      const twinkle = Math.sin(time * 3 + star.phase);
      if (twinkle < -0.35) return;

      const starAlpha = 0.5 + 0.5 * Math.abs(twinkle);
      if (star.type === 'cross' && twinkle > 0.3) {
        this.drawMatrix(STAR_CROSS, star.x - 2, star.y - 2, color, 1, starAlpha);
      } else if (star.type === 'cross') {
        this.drawMatrix(STAR_SMALL, star.x - 1, star.y - 1, color, 1, starAlpha);
      } else {
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = starAlpha;
        this.ctx.fillRect(star.x, star.y, 1, 1);
        this.ctx.globalAlpha = 1;
      }
    });
  }

  // Draw continuous urban city skyline matching panels 1-12 of the reference image
  public drawSkyline(color: string = '#FFFFFF', isFinalScene: boolean = false) {
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = 1;

    const groundY = 144;

    const drawBuilding = (
      x: number,
      y: number,
      w: number,
      h: number,
      spireH: number = 0,
      windows: { rx: number; ry: number; rw: number; rh: number }[] = []
    ) => {
      this.ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h);

      if (spireH > 0) {
        const midX = Math.round(x + w / 2);
        this.ctx.beginPath();
        this.ctx.moveTo(midX + 0.5, y);
        this.ctx.lineTo(midX + 0.5, y - spireH);
        this.ctx.stroke();
        this.ctx.fillRect(midX - 1, y - spireH - 2, 2, 2);
      }

      windows.forEach((win) => {
        this.ctx.fillRect(x + win.rx, y + win.ry, win.rw, win.rh);
      });
    };

    // --- FAR-LEFT SKYLINE TOWERS (x = 0 to 42) ---
    drawBuilding(0, 96, 14, 48, 4, [
      { rx: 3, ry: 8, rw: 2, rh: 3 },
      { rx: 8, ry: 8, rw: 2, rh: 3 },
      { rx: 3, ry: 18, rw: 2, rh: 3 },
      { rx: 8, ry: 18, rw: 2, rh: 3 },
    ]);
    drawBuilding(16, 70, 14, 74, 10, [
      { rx: 3, ry: 10, rw: 2, rh: 2 },
      { rx: 9, ry: 10, rw: 2, rh: 2 },
      { rx: 3, ry: 24, rw: 2, rh: 2 },
      { rx: 9, ry: 24, rw: 2, rh: 2 },
      { rx: 3, ry: 38, rw: 2, rh: 2 },
      { rx: 9, ry: 38, rw: 2, rh: 2 },
    ]);
    drawBuilding(32, 86, 14, 58, 6, [
      { rx: 3, ry: 8, rw: 2, rh: 2 },
      { rx: 8, ry: 8, rw: 2, rh: 2 },
      { rx: 3, ry: 18, rw: 2, rh: 2 },
      { rx: 8, ry: 18, rw: 2, rh: 2 },
    ]);

    // --- FAR-RIGHT SKYLINE TOWERS (x = 210 to 255) ---
    drawBuilding(210, 86, 14, 58, 6, [
      { rx: 3, ry: 10, rw: 2, rh: 2 },
      { rx: 8, ry: 10, rw: 2, rh: 2 },
      { rx: 3, ry: 22, rw: 2, rh: 2 },
      { rx: 8, ry: 22, rw: 2, rh: 2 },
    ]);
    drawBuilding(226, 70, 14, 74, 10, [
      { rx: 3, ry: 12, rw: 2, rh: 2 },
      { rx: 9, ry: 12, rw: 2, rh: 2 },
      { rx: 3, ry: 26, rw: 2, rh: 2 },
      { rx: 9, ry: 26, rw: 2, rh: 2 },
      { rx: 3, ry: 40, rw: 2, rh: 2 },
      { rx: 9, ry: 40, rw: 2, rh: 2 },
    ]);
    drawBuilding(242, 96, 14, 48, 4, [
      { rx: 3, ry: 8, rw: 2, rh: 3 },
      { rx: 8, ry: 8, rw: 2, rh: 3 },
    ]);

    if (!isFinalScene) {
      // In Scenes 1-8: Full continuous skyline with prominent towers across the entire background
      drawBuilding(48, 66, 16, 78, 12, [
        { rx: 3, ry: 12, rw: 2, rh: 2 },
        { rx: 10, ry: 12, rw: 2, rh: 2 },
        { rx: 3, ry: 26, rw: 2, rh: 2 },
        { rx: 10, ry: 26, rw: 2, rh: 2 },
        { rx: 3, ry: 40, rw: 2, rh: 2 },
        { rx: 10, ry: 40, rw: 2, rh: 2 },
      ]);
      drawBuilding(66, 94, 16, 50, 6, [
        { rx: 3, ry: 8, rw: 2, rh: 2 },
        { rx: 9, ry: 8, rw: 2, rh: 2 },
        { rx: 3, ry: 20, rw: 2, rh: 2 },
        { rx: 9, ry: 20, rw: 2, rh: 2 },
      ]);
      // Center Tower A
      drawBuilding(84, 58, 20, 86, 14, [
        { rx: 4, ry: 12, rw: 2, rh: 3 },
        { rx: 13, ry: 12, rw: 2, rh: 3 },
        { rx: 4, ry: 28, rw: 2, rh: 3 },
        { rx: 13, ry: 28, rw: 2, rh: 3 },
        { rx: 4, ry: 44, rw: 2, rh: 3 },
        { rx: 13, ry: 44, rw: 2, rh: 3 },
      ]);
      // Center Tower B
      drawBuilding(106, 76, 20, 68, 6, [
        { rx: 4, ry: 10, rw: 3, rh: 2 },
        { rx: 12, ry: 10, rw: 3, rh: 2 },
        { rx: 4, ry: 24, rw: 3, rh: 2 },
        { rx: 12, ry: 24, rw: 3, rh: 2 },
      ]);
      drawBuilding(128, 76, 20, 68, 6, [
        { rx: 4, ry: 10, rw: 3, rh: 2 },
        { rx: 12, ry: 10, rw: 3, rh: 2 },
        { rx: 4, ry: 24, rw: 3, rh: 2 },
        { rx: 12, ry: 24, rw: 3, rh: 2 },
      ]);
      // Center Tower C
      drawBuilding(150, 58, 20, 86, 14, [
        { rx: 4, ry: 12, rw: 2, rh: 3 },
        { rx: 13, ry: 12, rw: 2, rh: 3 },
        { rx: 4, ry: 28, rw: 2, rh: 3 },
        { rx: 13, ry: 28, rw: 2, rh: 3 },
        { rx: 4, ry: 44, rw: 2, rh: 3 },
        { rx: 13, ry: 44, rw: 2, rh: 3 },
      ]);
      drawBuilding(172, 94, 16, 50, 6, [
        { rx: 3, ry: 8, rw: 2, rh: 2 },
        { rx: 9, ry: 8, rw: 2, rh: 2 },
      ]);
      drawBuilding(190, 66, 18, 78, 12, [
        { rx: 4, ry: 12, rw: 2, rh: 2 },
        { rx: 11, ry: 12, rw: 2, rh: 2 },
        { rx: 4, ry: 26, rw: 2, rh: 2 },
        { rx: 11, ry: 26, rw: 2, rh: 2 },
      ]);

      // Continuous flat ground baseline across full width
      this.ctx.beginPath();
      this.ctx.moveTo(0, groundY + 0.5);
      this.ctx.lineTo(LOGICAL_WIDTH, groundY + 0.5);
      this.ctx.stroke();
    } else {
      // In Scenes 9-12 (matching panels 9-12):
      // The center 65% (x = 46 to 210) has ZERO tall towers, giving "I LOVE YOU"
      // an unobstructed pure black background!
      // Low segmented rooflines at bottom exactly matching panels 9-12: `_|_ . ___ |`
      this.ctx.beginPath();
      this.ctx.moveTo(46, 144.5);
      this.ctx.lineTo(60, 144.5);
      this.ctx.lineTo(60, 136.5);
      this.ctx.lineTo(76, 136.5);
      this.ctx.lineTo(76, 144.5);
      this.ctx.lineTo(92, 144.5);
      this.ctx.stroke();

      // Vertical antenna mark at x = 70
      this.ctx.beginPath();
      this.ctx.moveTo(70.5, 136.5);
      this.ctx.lineTo(70.5, 131.5);
      this.ctx.stroke();

      // Segmented ground dashes
      this.ctx.fillRect(100, 144, 4, 1);
      this.ctx.fillRect(116, 144, 10, 1);
      this.ctx.fillRect(138, 144, 10, 1);
      this.ctx.fillRect(156, 144, 6, 1);

      this.ctx.beginPath();
      this.ctx.moveTo(168, 144.5);
      this.ctx.lineTo(180, 144.5);
      this.ctx.lineTo(180, 136.5);
      this.ctx.lineTo(196, 136.5);
      this.ctx.lineTo(196, 144.5);
      this.ctx.lineTo(210, 144.5);
      this.ctx.stroke();

      // Ground baseline line on flanks
      this.ctx.beginPath();
      this.ctx.moveTo(0, groundY + 0.5);
      this.ctx.lineTo(46, groundY + 0.5);
      this.ctx.moveTo(210, groundY + 0.5);
      this.ctx.lineTo(LOGICAL_WIDTH, groundY + 0.5);
      this.ctx.stroke();
    }
  }

  public emitParticles(count: number, cx: number, cy: number, spread: number = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.8;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * spread,
        y: cy + (Math.random() - 0.5) * spread,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 0,
        maxLife: 40 + Math.random() * 50,
        size: Math.random() > 0.6 ? 2 : 1,
        alpha: 1,
        type: Math.random() > 0.7 ? 'cross' : 'pixel',
      });
    }
  }

  public updateAndDrawParticles(color: string = '#FFFFFF') {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.01;
      p.life += 1;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife || p.x < 0 || p.x > LOGICAL_WIDTH || p.y > LOGICAL_HEIGHT) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = p.alpha;
      if (p.type === 'cross' && p.alpha > 0.5) {
        this.ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1);
        this.ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3);
      } else {
        this.ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
    }
    this.ctx.globalAlpha = 1;
  }

  public clearParticles() {
    this.particles = [];
    this.clearHeartRain();
  }

  private createHeartRainParticle(initialY: number = -6): HeartRainParticle {
    const sizeRoll = Math.random();
    const size: 'nano' | 'micro' | 'tiny' =
      sizeRoll < 0.45 ? 'nano' : sizeRoll < 0.8 ? 'micro' : 'tiny';

    return {
      x: Math.random() * (LOGICAL_WIDTH - 24) + 12,
      y: initialY,
      speedY: 0.3 + Math.random() * 0.4,
      swayAmp: 2.5 + Math.random() * 4.5,
      swayFreq: 1.0 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      size,
      baseAlpha: size === 'tiny' ? 0.7 : size === 'micro' ? 0.6 : 0.45,
    };
  }

  public updateAndDrawHeartRain(time: number, color: string = '#FF8A00') {
    // Pre-seed particles across canvas height if empty on scene entry
    if (this.heartRainParticles.length === 0) {
      const initialCount = 14;
      for (let i = 0; i < initialCount; i++) {
        this.heartRainParticles.push(
          this.createHeartRainParticle(Math.random() * (LOGICAL_HEIGHT - 24))
        );
      }
    }

    // Spawn new hearts gently from the top
    if (this.heartRainParticles.length < 18 && Math.random() < 0.22) {
      this.heartRainParticles.push(this.createHeartRainParticle(-6));
    }

    // Update & draw particles
    for (let i = this.heartRainParticles.length - 1; i >= 0; i--) {
      const p = this.heartRainParticles[i];
      p.y += p.speedY;

      // Gentle swaying flutter
      const swayOffset = Math.sin(time * p.swayFreq + p.phase) * p.swayAmp;
      const currentX = Math.round(p.x + swayOffset);
      const currentY = Math.round(p.y);

      // Fade-in near top (y: 0 to 18) and fade-out near bottom skyline (y: 136 to 158)
      let alpha = p.baseAlpha;
      if (p.y < 18) {
        alpha = Math.max(0.1, (p.y / 18) * p.baseAlpha);
      } else if (p.y > 136) {
        alpha = Math.max(0, ((158 - p.y) / 22) * p.baseAlpha);
      }

      if (alpha > 0.04) {
        if (p.size === 'nano') {
          this.drawMatrix(HEART_NANO, currentX - 1, currentY - 1, color, 1, alpha);
        } else if (p.size === 'micro') {
          this.drawMatrix(HEART_MICRO, currentX - 2, currentY - 2, color, 1, alpha);
        } else {
          this.drawMatrix(HEART_TINY, currentX - 3, currentY - 3, color, 1, alpha);
        }
      }

      // Despawn once fallen past display bottom or drifted out
      if (p.y > LOGICAL_HEIGHT + 4 || currentX < -8 || currentX > LOGICAL_WIDTH + 8) {
        this.heartRainParticles.splice(i, 1);
      }
    }
  }

  public clearHeartRain() {
    this.heartRainParticles = [];
  }

  public renderScene(
    sceneId: number,
    progress: number,
    time: number,
    color: string = '#FF8A00',
    personalization: PersonalizationData,
    skylineColor: string = '#22c55e',
    characterColor: string = '#FF8A00'
  ) {
    if (sceneId < 11 && this.heartRainParticles.length > 0) {
      this.clearHeartRain();
    }

    const isFinalGroup = sceneId >= 9;
    // Default: Background kota warna hijau (#22c55e), karakter & tulisan warna orange (#FF8A00)
    const activeSkylineColor = skylineColor || '#22c55e';
    const activeCharColor = characterColor || color || '#FF8A00';

    // 1. Draw static night sky (moon & stars in green)
    this.drawNightSky(time, activeSkylineColor);

    // 2. Draw skyline in green
    this.drawSkyline(activeSkylineColor, isFinalGroup);

    // Character ground baseline: feet rest directly on ground at y = 144
    const groundY = 144;
    const walkCharH = 23;
    const charY = groundY - walkCharH;

    const getWalkSprite = (cycle: number, isBoy: boolean) => {
      const step = Math.floor(cycle) % 4;
      if (isBoy) {
        if (step === 0) return BOY_WALK_1;
        if (step === 1) return BOY_WALK_2;
        if (step === 2) return BOY_WALK_3;
        return BOY_WALK_2;
      } else {
        if (step === 0) return GIRL_WALK_1;
        if (step === 1) return GIRL_WALK_2;
        if (step === 2) return GIRL_WALK_3;
        return GIRL_WALK_2;
      }
    };

    switch (sceneId) {
      // ----------------------------------------------------
      // SCENE 1: WALKING FROM OPPOSITE SIDES
      // ----------------------------------------------------
      case 1: {
        const boyX = 14 + progress * 48; // 14 -> 62
        const girlX = 226 - progress * 48; // 226 -> 178
        const stepCycle = time * 7;

        this.drawMatrix(getWalkSprite(stepCycle, true), boyX, charY, activeCharColor);
        this.drawMatrix(getWalkSprite(stepCycle, false), girlX, charY, activeCharColor);
        break;
      }

      // ----------------------------------------------------
      // SCENE 2: APPROACHING THE CENTER
      // ----------------------------------------------------
      case 2: {
        const boyX = 62 + progress * 50; // 62 -> 112
        const girlX = 178 - progress * 50; // 178 -> 128
        const stepCycle = time * 7;

        this.drawMatrix(getWalkSprite(stepCycle, true), boyX, charY, activeCharColor);
        this.drawMatrix(getWalkSprite(stepCycle, false), girlX, charY, activeCharColor);
        break;
      }

      // ----------------------------------------------------
      // SCENE 3: MEETING IN THE CENTER
      // ----------------------------------------------------
      case 3: {
        const boyX = 112;
        const girlX = 128;

        const breath = Math.sin(time * 3) * 0.5;
        this.drawMatrix(BOY_STAND, boyX, charY + breath, activeCharColor);
        this.drawMatrix(GIRL_STAND, girlX, charY + breath, activeCharColor);
        break;
      }

      // ----------------------------------------------------
      // SCENE 4: FIRST EMBRACE + TINY HEART EMERGES
      // ----------------------------------------------------
      case 4: {
        const hugH = 19;
        const hugY = groundY - hugH;
        this.drawMatrix(HUG_FRAME_1, 116, hugY, activeCharColor);

        const heartY = 108 - progress * 14;
        this.drawMatrix(HEART_TINY, 126, Math.round(heartY), activeCharColor, 1);
        break;
      }

      // ----------------------------------------------------
      // SCENE 5: CLOSER, DEEPER HUG
      // ----------------------------------------------------
      case 5: {
        const hugH = 19;
        const hugY = groundY - hugH;
        this.drawMatrix(HUG_FRAME_2, 116, hugY, activeCharColor);

        const heartY = 94 + Math.sin(time * 4) * 2;
        this.drawMatrix(HEART_TINY, 126, Math.round(heartY), activeCharColor, 1);
        break;
      }

      // ----------------------------------------------------
      // SCENE 6: PIXEL TRANSFORMATION
      // ----------------------------------------------------
      case 6: {
        const hugH = 19;
        const hugY = groundY - hugH;
        const dissolveAlpha = Math.max(0, 1 - progress * 1.2);
        if (dissolveAlpha > 0.05) {
          this.drawMatrix(HUG_FRAME_2, 116, hugY, activeCharColor, 1, dissolveAlpha);
        }

        if (Math.random() > 0.2) {
          this.emitParticles(4, 128, hugY + 10, 24);
        }
        this.updateAndDrawParticles(activeCharColor);
        break;
      }

      // ----------------------------------------------------
      // SCENE 7: HEART EMERGES AT CENTER
      // ----------------------------------------------------
      case 7: {
        this.updateAndDrawParticles(activeCharColor);

        const heartScale = Math.min(1, progress * 1.5);
        const heartY = 94;
        if (heartScale > 0) {
          this.drawMatrix(HEART_MEDIUM, 128 - 7, heartY, activeCharColor, 1, heartScale);
        }

        const sparkle = Math.sin(time * 12);
        if (sparkle > 0.4) {
          this.drawMatrix(STAR_SMALL, 108, 90, activeSkylineColor, 1, 0.8);
          this.drawMatrix(STAR_SMALL, 142, 96, activeSkylineColor, 1, 0.8);
        }
        break;
      }

      // ----------------------------------------------------
      // SCENE 8: HEART GROWS / EXPANDS
      // ----------------------------------------------------
      case 8: {
        this.updateAndDrawParticles(activeCharColor);

        const scaleProgress = Math.min(1, progress * 1.2);
        const heartY = 80 - scaleProgress * 6;

        this.drawMatrix(HEART_LARGE_OUTLINE, 128 - 16, Math.round(heartY), activeCharColor, 1);

        if (Math.sin(time * 8) > 0.2) {
          this.drawMatrix(STAR_SMALL, 96, 68, activeSkylineColor, 1, 0.7);
          this.drawMatrix(STAR_SMALL, 156, 68, activeSkylineColor, 1, 0.7);
        }
        break;
      }

      // ----------------------------------------------------
      // SCENE 9: MESSAGE REVEAL ("I LOVE YOU")
      // ----------------------------------------------------
      case 9: {
        const heartY = 44;
        this.drawMatrix(HEART_MEDIUM, 128 - 7, heartY, activeCharColor, 1);

        const textAlpha = Math.min(1, progress * 1.4);
        this.drawILoveYouText(128, 86, activeCharColor, 2, textAlpha);

        this.drawMatrix(STAR_CROSS, 92, 52, activeSkylineColor, 1, 0.6);
        this.drawMatrix(STAR_CROSS, 160, 52, activeSkylineColor, 1, 0.6);
        break;
      }

      // ----------------------------------------------------
      // SCENE 10: PULSING HEART & TEXT ANIMATION
      // ----------------------------------------------------
      case 10: {
        const beatCycle = (time * 2) % 1;
        let pulseScale = 1;
        if (beatCycle < 0.15) {
          pulseScale = 1 + Math.sin((beatCycle / 0.15) * Math.PI) * 0.18;
        } else if (beatCycle > 0.25 && beatCycle < 0.4) {
          pulseScale = 1 + Math.sin(((beatCycle - 0.25) / 0.15) * Math.PI) * 0.12;
        }

        const heartY = 44;
        const heartX = 128 - 7;
        this.drawMatrix(HEART_MEDIUM, heartX, heartY, activeCharColor, 1);

        const textAlpha = 0.85 + 0.15 * Math.sin(time * 5);
        this.drawILoveYouText(128, 86, activeCharColor, 2, textAlpha);

        if (Math.sin(time * 6) > 0.1) {
          this.drawMatrix(STAR_SMALL, 44, 86, activeSkylineColor, 1, 0.8);
          this.drawMatrix(STAR_SMALL, 208, 86, activeSkylineColor, 1, 0.8);
        }
        break;
      }

      // ----------------------------------------------------
      // SCENE 11: FINAL COMPOSITION WITH CUSTOM DEDICATION
      // ----------------------------------------------------
      case 11:
      // ----------------------------------------------------
      // SCENE 12: HOLDING IN ETERNAL GLOW / LOOP
      // ----------------------------------------------------
      case 12: {
        const beatCycle = (time * 1.8) % 1;
        const isBeating = beatCycle < 0.14 || (beatCycle > 0.22 && beatCycle < 0.34);

        const heartY = 44;
        const heartX = 128 - 7;
        this.drawMatrix(HEART_MEDIUM, heartX, heartY, activeCharColor, 1);

        const textAlpha = isBeating ? 1.0 : 0.92;
        this.drawILoveYouText(128, 86, activeCharColor, 2, textAlpha);

        if (personalization.recipient || personalization.customMessage) {
          // Prepare dedication names
          let nameLine = '';
          if (personalization.recipient) {
            nameLine = `FOR ${personalization.recipient}`;
          }
          if (personalization.sender) {
            nameLine += (nameLine ? ' • ' : '') + `FROM ${personalization.sender}`;
          }

          const hasName = Boolean(nameLine);
          let nameLines: string[] = [];
          if (hasName) {
            if (this.measure5x7Text(nameLine) > 160 && personalization.recipient && personalization.sender) {
              nameLines = [`FOR ${personalization.recipient}`, `FROM ${personalization.sender}`];
            } else {
              nameLines = [nameLine];
            }
          }

          // Wrap custom message into lines fitting safely between the skyline towers (max 24 chars)
          const msgLines = personalization.customMessage
            ? this.wrapText(personalization.customMessage, 24)
            : [];

          const totalLines = nameLines.length + msgLines.length;

          let startY = 106;
          let lineSpacing = 10;

          if (totalLines === 1) {
            startY = 114;
          } else if (totalLines === 2) {
            startY = 108;
            lineSpacing = 11;
          } else if (totalLines === 3) {
            startY = 104;
            lineSpacing = 10;
          } else if (totalLines >= 4) {
            startY = 102;
            lineSpacing = 9;
          }

          let currentY = startY;

          // Render Dedication Name lines (bright with backdrop)
          nameLines.forEach((line) => {
            const w = this.measure5x7Text(line, 1);
            const x = Math.round(128 - w / 2);
            this.draw5x7Text(line, x, currentY, activeCharColor, 1, 1.0, true);
            currentY += lineSpacing;
          });

          // Render Custom Romantic Message lines (untruncated, wrapped, with heart glyph)
          msgLines.forEach((line) => {
            const w = this.measure5x7Text(line, 1);
            const x = Math.round(128 - w / 2);
            this.draw5x7Text(line, x, currentY, activeCharColor, 1, 0.95, true);
            currentY += lineSpacing;
          });
        }

        this.drawMatrix(STAR_CROSS, 82, 50, activeSkylineColor, 1, 0.7);
        this.drawMatrix(STAR_CROSS, 168, 50, activeSkylineColor, 1, 0.7);
        this.drawMatrix(STAR_SMALL, 44, 86, activeSkylineColor, 1, 0.6);
        this.drawMatrix(STAR_SMALL, 208, 86, activeSkylineColor, 1, 0.6);

        // Subtle romantic heart rain animation overlay
        this.updateAndDrawHeartRain(time, activeCharColor);
        break;
      }
    }
  }
}
