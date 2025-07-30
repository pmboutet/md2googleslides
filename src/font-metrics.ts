import arial from '@capsizecss/metrics/arial';
import roboto from '@capsizecss/metrics/roboto';

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

export function getFontMetrics(fontFamily: string): CapsizeMetrics {
  return METRICS[fontFamily] || METRICS['Arial'];
}
