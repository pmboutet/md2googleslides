import arial from '@capsize/metrics/arial';
import roboto from '@capsize/metrics/roboto';
import {fontFamilyToCamelCase} from '@capsize/metrics';
import {entireMetricsCollection} from '@capsize/metrics/entireMetricsCollection';

export interface CapsizeMetrics {
  ascent: number;
  descent: number;
  lineGap: number;
  unitsPerEm: number;
  xWidthAvg: number;
}

const METRICS: Record<string, CapsizeMetrics> = {
  Arial: arial as unknown as CapsizeMetrics,
  Roboto: roboto as unknown as CapsizeMetrics,
};

/**
 * Calculate font metrics using Canvas API for fonts not in Capsize
 */
function calculateMetricsFromCanvas(fontFamily: string, fontSize = 1000): CapsizeMetrics {
  if (typeof document === 'undefined') {
    // Fallback for server-side rendering
    console.warn(`Canvas not available for ${fontFamily}, using Arial fallback`);
    return METRICS['Arial'];
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.warn(`Canvas context not available for ${fontFamily}, using Arial fallback`);
    return METRICS['Arial'];
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
    return METRICS['Arial'];
  }
}

function loadMetrics(fontFamily: string): CapsizeMetrics | undefined {
  const key = fontFamilyToCamelCase(fontFamily);
  const metrics = (entireMetricsCollection as Record<string, any>)[key];
  
  if (!metrics) {
    // Try common variations for font names
    const variations = [
      fontFamily.toLowerCase().replace(/\s+/g, ''),
      fontFamily.replace(/\s+/g, ''),
      fontFamily.toLowerCase().replace(/\s+/g, '-'),
    ];
    
    for (const variation of variations) {
      const variantKey = fontFamilyToCamelCase(variation);
      const variantMetrics = (entireMetricsCollection as Record<string, any>)[variantKey];
      if (variantMetrics) {
        const {ascent, descent, lineGap, unitsPerEm, xWidthAvg} = variantMetrics;
        console.log(`Found metrics for ${fontFamily} via variation: ${variation}`);
        return {ascent, descent, lineGap, unitsPerEm, xWidthAvg};
      }
    }
    
    return undefined;
  }
  
  const {ascent, descent, lineGap, unitsPerEm, xWidthAvg} = metrics;
  return {ascent, descent, lineGap, unitsPerEm, xWidthAvg};
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
  // Check hardcoded metrics first
  if (METRICS[fontFamily]) {
    return METRICS[fontFamily];
  }

  // Try to load from Capsize collection
  const loaded = loadMetrics(fontFamily);
  if (loaded) {
    METRICS[fontFamily] = loaded;
    return loaded;
  }
  
  // Calculate dynamically using Canvas API
  console.log(`Computing metrics for ${fontFamily} using Canvas API`);
  const calculated = calculateMetricsFromCanvas(fontFamily);
  
  // Cache the calculated metrics
  METRICS[fontFamily] = calculated;
  
  return calculated;
}

/**
 * Extract fonts used in a Google Slides presentation
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
