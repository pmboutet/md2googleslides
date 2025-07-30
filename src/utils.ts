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
  min = 8
): number {
  const widthPt = emuToPoints(box.width);
  const heightPt = emuToPoints(box.height);
  const lines = Math.max(text.split('\n').length, 1);
  const longestLine = text
    .split('\n')
    .reduce((m, line) => Math.max(m, line.length), 0);
  const sizeByHeight = heightPt / (lines * 1.2);
  const sizeByWidth = widthPt / (longestLine * 0.6);
  const size = Math.min(max, sizeByHeight, sizeByWidth);
  return size < min ? min : size;
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
  const ratio = targetSize / currentMax;

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
