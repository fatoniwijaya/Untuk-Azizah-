<<<<<<< HEAD
# OLED Love Animation — Retro Pixel-Art Romantic Web App

A complete, responsive, romantic pixel-art animation website faithfully recreating the 12-scene sequence from the reference OLED display. The application looks and feels like a miniature retro LCD/OLED display with a deep black screen, metallic enclosure with corner mounting screws, electric cyan inner glowing border, monochrome white pixel art, nighttime city skyline, twinkling stars, crescent moon, walking lovers, embrace, particle transformation, expanding heart, and the final "I LOVE YOU" message.

---

## 🌟 The 12-Scene Romantic Storyboard

1. **Scene 1 — Dua orang berjalan dari sisi kiri dan kanan (Walking from opposite sides):**
   Boy and girl appear at opposite edges of the screen and walk toward each other under the night sky.
2. **Scene 2 — Mendekat ke tengah (Approaching the center):**
   Legs and arms swing in smooth walk cycles with subtle retro footstep clicks as they draw closer.
3. **Scene 3 — Bertemu di tengah (Meeting in the center):**
   Both lovers reach the center and stop face-to-face, turning toward each other under the crescent moon.
4. **Scene 4 — Berpelukan (First hug):**
   They step forward into an embrace, and a tiny pixel heart sparkles into existence above their heads.
5. **Scene 5 — Pelukan [lebih dekat] (Closer hug):**
   A tighter, more affectionate embrace. The floating heart gently pulses and hovers higher.
6. **Scene 6 — Efek transformasi (Pixel transformation):**
   A controlled transformation burst: characters dissolve into swirling white pixel particles and stardust.
7. **Scene 7 — Muncul love (Heart emerges):**
   The characters dissolve completely, and a crisp solid white pixel heart emerges at the center with radiant sparkles.
8. **Scene 8 — Love membesar (Heart grows):**
   The heart expands smoothly into a large, bold stepped pixel-outline heart.
9. **Scene 9 — Muncul tulisan I LOVE YOU (Message reveal):**
   The heart settles at the upper center, and bold retro bitmap lettering spells out **"I LOVE YOU"** below.
10. **Scene 10 — Efek animasi tulisan [berkedip/pulsing] (Pulsing text & heartbeat):**
    The heart beats to a warm procedural lub-dub heartbeat sound while the text gently pulses.
11. **Scene 11 — Tampilan akhir (Final display):**
    The full composition is held on screen: moon, stars, beating heart, "I LOVE YOU", city skyline, and personalized dedication.
12. **Scene 12 — Tetap di layar (Holding in eternal glow):**
    Holds indefinitely with gentle starlight and heartbeat, or loops smoothly back to Scene 1 without layout jump or flicker.

---

## 🎨 Interactive Features

- **Pixel-Art Engine:** Logical 256×160 resolution rendered via HTML5 Canvas with `image-rendering: pixelated` and subpixel crispness.
- **Hardware OLED Bezel:** Realistic recessed matte frame, corner hex mounting screws, cyan pinstripe neon border glow, glass reflection, and toggleable retro scanlines.
- **Chiptune Web Audio Synthesizer:** Pure procedural Web Audio API sounds (footsteps, meeting chime, hug chord, particle sparkle arpeggio, heart reveal sweep, and heartbeat). Off by default to respect browser autoplay policies.
- **Playback Controls:** Play, Pause, Replay, Prev/Next Scene step, Scene scrubber dropdown, Speed adjustment (0.5x, 1x, 1.5x, 2x), and Fullscreen.
- **Multiple OLED Color Themes:**
  - Classic Cyan OLED (Default)
  - Monochrome White OLED
  - Vintage Amber LCD
  - Matrix Emerald Green
- **Personalization & URL Sharing:**
  - Set Recipient Name (`To`), Sender Name (`From`), and Custom Love Note (`Message`).
  - Automatically encodes parameters in the URL query string (`?to=Sarah&from=Alex&msg=...`).
  - When opened by the recipient, the animation instantly displays their personalized dedication!
- **Direct WhatsApp Sharing:** Official WhatsApp click-to-chat integration (`https://wa.me/?text=...`) with URL encoding and Web Share API support.

---

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://localhost:3000`.

---

## 📦 Deployment Instructions

This project is completely client-side (HTML5, Canvas, Web Audio API, React). It requires **no backend server or database** to run.

### 1. GitHub Pages (Otomatis via GitHub Actions — Rekomendasi Bebas 403)
Workflow `.github/workflows/deploy.yml` sudah tersedia di dalam repositori ini.

1. **Inisialisasi Git & Push ke GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: OLED Love Animation with GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/<username-kamu>/oled-love.git
   git push -u origin main
   ```
2. **Aktifkan Pages di GitHub**:
   - Buka repositori kamu di GitHub.
   - Pergi ke **Settings** > **Pages**.
   - Pada bagian **Build and deployment > Source**, pilih **GitHub Actions**.
3. Dalam 1 menit, website kamu akan live di `https://<username-kamu>.github.io/oled-love/` dan siap dibuka oleh siapa saja di WhatsApp tanpa login Google!

### 2. Netlify / Vercel
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- Drag-and-drop folder `dist` ke Vercel atau Netlify untuk deployment instan.

---

## ⌨️ Keyboard Shortcuts

- `Space`: Play / Pause
- `R`: Replay from Scene 1
- `M`: Toggle Sound Mute / Unmute
- `Arrow Left`: Previous Scene
- `Arrow Right`: Next Scene
- `F`: Toggle Fullscreen

---

## 🚀 Panduan Deploy ke GitHub & GitHub Pages

Repositori Git lokal sudah diinisialisasi dengan branch `main` dan commit lengkap.

### Langkah untuk push ke akun GitHub Anda:
1. Buka [GitHub](https://github.com) dan buat repositori baru (contoh: `oled-love-animation`).
2. Jalankan perintah berikut di terminal Anda:
```bash
git remote add origin https://github.com/<USERNAME-ANDA>/oled-love-animation.git
git branch -M main
git push -u origin main
```
3. Aktifkan **GitHub Pages**:
   - Di repositori GitHub Anda, buka tab **Settings** > **Pages**.
   - Pada bagian **Build and deployment** > **Source**, pilih **GitHub Actions**.
   - Workflow `.github/workflows/deploy.yml` yang sudah kami sertakan akan otomatis meng-compile dan mempublikasikan website ke:
     `https://<USERNAME-ANDA>.github.io/oled-love-animation/`

---

## 🌐 Link Publik Langsung (Bisa Dibuka di Semua Device Sekarang)

Aplikasi ini sudah aktif dan dapat diakses langsung oleh siapa saja di HP Android, iPhone, Tablet, maupun Laptop:
👉 **[Buka Animasi OLED Love](https://ais-pre-jouxx72jqohnjjwr3ummpa-250258514907.asia-southeast1.run.app)**
=======
# Untuk-Azizah-
Untuk Azizah ❤️ Ada animasi cinta retro OLED spesial yang dibuatkan khusus untukmu! (Dari: Mr.Wijaya)  "Untuk seseorang yang selalu spesial ❤️"
>>>>>>> origin/main
