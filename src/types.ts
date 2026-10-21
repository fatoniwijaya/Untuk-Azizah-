export interface PersonalizationData {
  recipient: string;
  sender: string;
  customMessage: string;
}

export type OledTheme = 'cyan' | 'white' | 'amber' | 'emerald';

export interface SceneMeta {
  id: number;
  titleId: string; // Indonesian title as in reference image
  titleEn: string;
  duration: number; // in seconds
  description: string;
}

export const SCENES: SceneMeta[] = [
  {
    id: 1,
    titleId: '1. Dua orang berjalan dari sisi kiri dan kanan',
    titleEn: 'Walking from opposite sides',
    duration: 3.2,
    description: 'Boy and girl start at opposite edges and begin their journey toward each other under the night sky.',
  },
  {
    id: 2,
    titleId: '2. Mendekat ke tengah',
    titleEn: 'Approaching the center',
    duration: 2.8,
    description: 'Animated walk cycles bring them closer, footsteps echoing against the silhouetted city skyline.',
  },
  {
    id: 3,
    titleId: '3. Bertemu di tengah',
    titleEn: 'Meeting in the center',
    duration: 2.2,
    description: 'They stop at the center, turning to face one another under the crescent moon.',
  },
  {
    id: 4,
    titleId: '4. Berpelukan',
    titleEn: 'First embrace',
    duration: 2.5,
    description: 'They embrace as a tiny pixel heart sparkles into existence above their heads.',
  },
  {
    id: 5,
    titleId: '5. Pelukan (lebih dekat)',
    titleEn: 'Closer, deeper hug',
    duration: 2.6,
    description: 'A warmer, tighter hug. The glowing heart floats gently higher as the bond deepens.',
  },
  {
    id: 6,
    titleId: '6. Efek transformasi',
    titleEn: 'Pixel transformation',
    duration: 2.8,
    description: 'White pixel particles swirl and shimmer, dissolving the lovers into stardust.',
  },
  {
    id: 7,
    titleId: '7. Muncul love',
    titleEn: 'Heart emerges',
    duration: 2.4,
    description: 'From the swirling pixel stardust, a pure solid white heart appears at the center.',
  },
  {
    id: 8,
    titleId: '8. Love membesar',
    titleEn: 'Heart expands',
    duration: 2.4,
    description: 'The heart expands grandly, with bold stepped pixel outlines illuminating the night.',
  },
  {
    id: 9,
    titleId: '9. Muncul tulisan I LOVE YOU',
    titleEn: 'I LOVE YOU reveals',
    duration: 2.6,
    description: 'The heart settles above as crisp retro pixel lettering spells out "I LOVE YOU".',
  },
  {
    id: 10,
    titleId: '10. Efek animasi tulisan (berkedip/pulsing)',
    titleEn: 'Pulsing text & heartbeat',
    duration: 2.8,
    description: 'The heart pulses to a rhythmic heartbeat while the glowing letters shine with warmth.',
  },
  {
    id: 11,
    titleId: '11. Tampilan akhir',
    titleEn: 'Final romantic display',
    duration: 3.2,
    description: 'Full breathtaking composition with skyline, twinkling stars, moon, heart, and dedication.',
  },
  {
    id: 12,
    titleId: '12. Tetap di layar',
    titleEn: 'Holding in eternal glow',
    duration: 5.0,
    description: 'The romantic message holds permanently or loops seamlessly back to the beginning.',
  },
];
