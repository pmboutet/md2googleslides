import {execSync} from 'child_process';
import * as opentype from 'opentype.js';

export interface CapsizeMetrics {
  ascent: number;
  descent: number;
  lineGap: number;
  unitsPerEm: number;
  xWidthAvg: number;
}

// Basic font metrics - can be extended as needed
const BASIC_METRICS: Record<string, CapsizeMetrics> = {
  Arial: {
    ascent: 728,
    descent: -210,
    lineGap: 67,
    unitsPerEm: 1000,
    xWidthAvg: 554,
  },
  Roboto: {
    ascent: 927,
    descent: -244,
    lineGap: 0,
    unitsPerEm: 1000,
    xWidthAvg: 543,
  },
  Montserrat: {
    ascent: 968,
    descent: -251,
    lineGap: 0,
    unitsPerEm: 1000,
    xWidthAvg: 542,
  },
};

function downloadFontData(fontFamily: string): Buffer | null {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}&display=swap`;
    const css = execSync(`curl -L -s "${cssUrl}"`).toString();
    const match = css.match(/url\(([^)]+\.ttf)\)/);
    if (!match) {
      console.warn(`Font URL not found for ${fontFamily}`);
      return null;
    }
    const fontUrl = match[1];
    return execSync(`curl -L -s "${fontUrl}"`);
  } catch (err) {
    console.warn(`Failed to download font ${fontFamily}:`, err);
    return null;
  }
}

function calculateMetricsFromFontFile(fontFamily: string): CapsizeMetrics | null {
  const data = downloadFontData(fontFamily);
  if (!data) {
    return null;
  }
  try {
    const font = opentype.parse(Uint8Array.from(data).buffer);
    const ascent = font.ascender;
    const descent = font.descender;
    const lineGap = font.tables.os2.sTypoLineGap || 0;
    const unitsPerEm = font.unitsPerEm;
    const xWidthAvg = font.tables.os2.xAvgCharWidth || 500;
    console.log(`Downloaded metrics for ${fontFamily}:`, {ascent, descent, lineGap, unitsPerEm, xWidthAvg});
    return {ascent, descent, lineGap, unitsPerEm, xWidthAvg};
  } catch (err) {
    console.warn(`Error parsing font ${fontFamily}:`, err);
    return null;
  }
}

/**
 * Calculate font metrics using Canvas API for fonts not in basic metrics
 */
function calculateMetricsFromCanvas(fontFamily: string, fontSize = 1000): CapsizeMetrics {
  if (typeof document === 'undefined') {
    // Server side: try downloading the font and reading metrics
    const downloaded = calculateMetricsFromFontFile(fontFamily);
    if (downloaded) {
      return downloaded;
    }
    console.warn(`Canvas not available for ${fontFamily}, using Arial fallback`);
    return BASIC_METRICS['Arial'];
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.warn(`Canvas context not available for ${fontFamily}, using Arial fallback`);
    return BASIC_METRICS['Arial'];
  }

  try {
    ctx.font = `${fontSize}px "${fontFamily}", Arial`; // Arial fallback in CSS
    
    // Measure various characters to get accurate metrics
    const textMetrics = ctx.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
    const emMetrics = ctx.measureText('M');
    const xMetrics = ctx.measureText('x');
    
    // Calculate metrics based on Canvas measurements
    const ascent = textMetrics.actualBoundingBoxAscent;
    const descent = textMetrics.actualBoundingBoxDescent;
    
    // Estimate line gap (typically 15-20% of font size)
    const lineGap = fontSize * 0.17;
    
    // Calculate average character width (approximation)
    const totalWidth = textMetrics.width;
    const charCount = 62; // Length of test string
    const avgCharWidth = totalWidth / charCount;
    
    console.log(`Calculated metrics for ${fontFamily}:`, {
      ascent: ascent,
      descent: descent,
      lineGap: lineGap,
      unitsPerEm: fontSize,
      xWidthAvg: avgCharWidth
    });

    return {
      ascent: ascent,
      descent: descent,
      lineGap: lineGap,
      unitsPerEm: fontSize,
      xWidthAvg: avgCharWidth,
    };
  } catch (error) {
    console.warn(`Error calculating metrics for ${fontFamily}:`, error);
    return BASIC_METRICS['Arial'];
  }
}

function selectBestFallback(fontFamily: string): string {
  const sansSerifFonts = ['helvetica', 'roboto', 'montserrat', 'open sans', 'lato'];
  const fontLower = fontFamily.toLowerCase();
  
  // Use Roboto for modern sans-serif fonts, Arial for others
  if (sansSerifFonts.some(font => fontLower.includes(font))) {
    return 'Roboto';
  }
  
  return 'Arial';
}

export function getFontMetrics(fontFamily: string): CapsizeMetrics {
  // Check basic metrics first
  if (BASIC_METRICS[fontFamily]) {
    return BASIC_METRICS[fontFamily];
  }

  // Try common font name variations
  const variations = [
    fontFamily,
    fontFamily.toLowerCase(),
    fontFamily.replace(/\s+/g, ''),
    fontFamily.toLowerCase().replace(/\s+/g, ''),
  ];

  for (const variation of variations) {
    if (BASIC_METRICS[variation]) {
      console.log(`Found metrics for ${fontFamily} via variation: ${variation}`);
      BASIC_METRICS[fontFamily] = BASIC_METRICS[variation]; // Cache it
      return BASIC_METRICS[variation];
    }
  }

  // Calculate dynamically using Canvas API or downloaded font
  console.log(`Computing metrics for ${fontFamily} using Canvas API`);
  const calculated = calculateMetricsFromCanvas(fontFamily);

  // Cache the calculated metrics
  BASIC_METRICS[fontFamily] = calculated;
  
  return calculated;
}

/**
 * Extract fonts used in slide definitions
 * This can be called before processing slides to pre-warm the font cache
 */
export function extractFontsFromSlides(slides: any[]): Set<string> {
  const fonts = new Set<string>();
  
  for (const slide of slides) {
    // Extract from title
    if (slide.title?.textRuns) {
      for (const run of slide.title.textRuns) {
        if (run.fontFamily) {
          fonts.add(run.fontFamily);
        }
      }
    }
    
    // Extract from bodies
    for (const body of slide.bodies || []) {
      if (body.text?.textRuns) {
        for (const run of body.text.textRuns) {
          if (run.fontFamily) {
            fonts.add(run.fontFamily);
          }
        }
      }
    }
  }
  
  return fonts;
}

/**
 * Pre-load font metrics for all fonts that will be used
 * Call this early in the process to calculate metrics once
 */
export function preloadFontMetrics(fontFamilies: string[]): void {
  console.log(`Pre-loading metrics for fonts: ${fontFamilies.join(', ')}`);
  
  for (const fontFamily of fontFamilies) {
    getFontMetrics(fontFamily); // This will calculate and cache the metrics
  }
}
