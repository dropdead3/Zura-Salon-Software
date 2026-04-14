import { getTerminalPalette } from '@/lib/terminal-splash-palettes';
import type { ColorTheme } from '@/hooks/useColorTheme';

const TARGET_W = 1080;
const TARGET_H = 1920;

/**
 * Generate the default luxury terminal splash screen image on a canvas.
 * Returns { base64, dataUrl } ready for upload or preview.
 */
export async function generateDefaultSplash(
  orgLogoUrl: string,
  businessName: string,
  colorTheme: ColorTheme,
): Promise<{ base64: string; dataUrl: string }> {
  // Load the logo image
  const img = new window.Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = orgLogoUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext('2d')!;

  const p = getTerminalPalette(colorTheme);

  // Solid black base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, TARGET_W, TARGET_H);

  // Corner glow constants
  const glowInset = 40;
  const glowRadius = 1200;

  // Corner glow — top-left
  const tlGlow = ctx.createRadialGradient(glowInset, glowInset, 0, glowInset, glowInset, glowRadius);
  tlGlow.addColorStop(0, p.accentRgba(0.18));
  tlGlow.addColorStop(0.55, p.accentRgba(0.06));
  tlGlow.addColorStop(1, p.accentRgba(0));
  ctx.fillStyle = tlGlow;
  ctx.fillRect(0, 0, TARGET_W, TARGET_H);

  // Corner glow — bottom-right
  const brGlow = ctx.createRadialGradient(TARGET_W - glowInset, TARGET_H - glowInset, 0, TARGET_W - glowInset, TARGET_H - glowInset, glowRadius);
  brGlow.addColorStop(0, p.accentRgba(0.18));
  brGlow.addColorStop(0.55, p.accentRgba(0.06));
  brGlow.addColorStop(1, p.accentRgba(0));
  ctx.fillStyle = brGlow;
  ctx.fillRect(0, 0, TARGET_W, TARGET_H);

  // Center-center layout for logo + business name group
  const maxLogo = 520;
  const logoScale = Math.min(maxLogo / img.width, maxLogo / img.height);
  const lw = img.width * logoScale;
  const lh = img.height * logoScale;
  const textBlockHeight = 28;
  const groupGap = 70;
  const totalGroupHeight = lh + groupGap + textBlockHeight;
  const groupTop = (TARGET_H / 2) - totalGroupHeight / 2;

  // Draw logo centered in group
  const lx = (TARGET_W - lw) / 2;
  const ly = groupTop;
  ctx.drawImage(img, lx, ly, lw, lh);

  // Location/business name below logo
  ctx.fillStyle = p.mutedColor;
  ctx.font = '500 24px "Termina", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '5px';
  const nameY = ly + lh + groupGap;
  ctx.fillText(businessName.toUpperCase(), TARGET_W / 2, nameY);

  // Zura Z icon at bottom — 84px
  const zSize = 84;
  const zX = (TARGET_W - zSize) / 2;
  const zY = TARGET_H - 210;
  const cellSize = zSize / 7;
  const gap = cellSize * 0.37;
  const dotSize = cellSize - gap;
  const radius = dotSize * 0.2;

  ctx.fillStyle = p.accentRgba(0.7);

  const zDots = [
    [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
    [1,5],[1,6],
    [2,4],[2,5],
    [3,3],[3,4],
    [4,2],[4,3],
    [5,1],[5,2],
    [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[6,6],
  ];

  for (const [row, col] of zDots) {
    const dx = zX + col * cellSize;
    const dy = zY + row * cellSize;
    ctx.beginPath();
    ctx.roundRect(dx, dy, dotSize, dotSize, radius);
    ctx.fill();
  }

  // "Powered by Zura" text
  ctx.fillStyle = p.accentRgba(0.7);
  ctx.font = '500 28px "Termina", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('POWERED BY ZURA', TARGET_W / 2, zY + zSize + 50);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.split(',')[1];
  return { base64, dataUrl };
}
