import arial from '@capsizecss/metrics/arial';
import roboto from '@capsizecss/metrics/roboto';
import {fontFamilyToCamelCase} from '@capsizecss/metrics';
import {entireMetricsCollection} from '@capsizecss/metrics/entireMetricsCollection';

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

function loadMetrics(fontFamily: string): CapsizeMetrics | undefined {
  const key = fontFamilyToCamelCase(fontFamily);
  const metrics = (entireMetricsCollection as Record<string, any>)[key];
  if (!metrics) {
    return undefined;
  }
  const {ascent, descent, lineGap, unitsPerEm, xWidthAvg} = metrics;
  return {ascent, descent, lineGap, unitsPerEm, xWidthAvg};
}

export function getFontMetrics(fontFamily: string): CapsizeMetrics {
  if (!METRICS[fontFamily]) {
    const loaded = loadMetrics(fontFamily);
    if (loaded) {
      METRICS[fontFamily] = loaded;
    }
  }
  return METRICS[fontFamily] || METRICS['Arial'];
}
