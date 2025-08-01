// Copyright 2019 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {v1 as uuidV1} from 'uuid';

import {TextDefinition, FontSize, StyleDefinition} from './slides';
import {measureWrappedText} from './text-measurement';


export function uuid(): string {
  return uuidV1();
}

export function emuToPoints(emu: number): number {
  return emu / 12700;
}

export function estimateFontSize(
  text: string,
  box: {width: number; height: number},
  max = 48,
  min = 8,
  fontFamily = 'Arial'
): number {
  const widthPt = emuToPoints(box.width);
  const heightPt = emuToPoints(box.height);

  let low = min;
  let high = max;
  let best = min;

  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    const {width, height} = measureWrappedText(text, mid, widthPt, fontFamily);
    if (width <= widthPt && height <= heightPt) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return best;
}


export function maxFontSize(text: TextDefinition, base = 18): number {
  let max = base;
  for (const run of text.textRuns) {
    if (run.fontSize && run.fontSize.magnitude > max) {
      max = run.fontSize.magnitude;
    }
  }
  return max;
}

export function applyFontSize(
  text: TextDefinition,
  targetSize: number,
  base = 18
): TextDefinition {
  const currentMax = maxFontSize(text, base);
  // Apply a 20% reduction to better match rendered sizes in Slides
  const ratio = (targetSize / currentMax) * 0.8;

  const baseRun: StyleDefinition = {
    start: 0,
    end: text.rawText.length,
    fontSize: {magnitude: base * ratio, unit: 'PT'},
  };

  return {
    ...text,
    textRuns: [
      baseRun,
      ...text.textRuns.map(run => ({
        ...run,
        fontSize: {
          magnitude: (run.fontSize?.magnitude ?? base) * ratio,
          unit: 'PT',
        },
      })),
    ],

  };
}
