import arial from '@capsize/metrics/arial';
import roboto from '@capsize/metrics/roboto';
import montserrat from '@capsize/metrics/montserrat';
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
  Montserrat: montserrat as unknown as CapsizeMetrics,
};

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
        return {ascent, descent, lineGap, unitsPerEm, xWidthAvg};
      }
    }
    
    console.warn(`Font metrics not found for: ${fontFamily}, using fallback`);
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
  if (!METRICS[fontFamily]) {
    const loaded = loadMetrics(fontFamily);
    if (loaded) {
      METRICS[fontFamily] = loaded;
    }
  }
  
  // If font not found, use intelligent fallback
  if (!METRICS[fontFamily]) {
    const fallback = selectBestFallback(fontFamily);
    console.warn(`Using ${fallback} as fallback for ${fontFamily}`);
    return METRICS[fallback];
  }
  
  return METRICS[fontFamily];
}
