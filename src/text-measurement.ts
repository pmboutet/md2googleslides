import {getFontMetrics} from './font-metrics';

export interface MeasuredText {
  width: number;
  height: number;
  lines: number;
}

function charWidth(charCount: number, fontSize: number, fontFamily: string): number {
  const metrics = getFontMetrics(fontFamily);
  const scale = fontSize / metrics.unitsPerEm;
  const avg = metrics.xWidthAvg;
  return charCount * avg * scale;
}

function lineHeight(fontSize: number, fontFamily: string): number {
  const m = getFontMetrics(fontFamily);
  const scale = fontSize / m.unitsPerEm;
  return (m.ascent - m.descent + m.lineGap) * scale;
}

export function measureWrappedText(
  text: string,
  fontSize: number,
  boxWidth: number,
  fontFamily = 'Arial'
): MeasuredText {
  const paragraphs = text.split('\n');
  const lh = lineHeight(fontSize, fontFamily);
  let lines = 0;
  let maxWidth = 0;
  for (const p of paragraphs) {
    if (p.trim() === '') {
      lines += 1;
      continue;
    }
    const words = p.split(' ');
    let lineWidth = 0;
    for (const word of words) {
      const wordWidth = charWidth(word.length, fontSize, fontFamily) + charWidth(1, fontSize, fontFamily);
      if (lineWidth + wordWidth > boxWidth && lineWidth > 0) {
        maxWidth = Math.max(maxWidth, lineWidth);
        lines += 1;
        lineWidth = wordWidth;
      } else {
        lineWidth += wordWidth;
      }
    }
    maxWidth = Math.max(maxWidth, lineWidth);
    lines += 1;
  }
  return {width: maxWidth, height: lines * lh, lines};
}
