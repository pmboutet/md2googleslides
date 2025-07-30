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
import {TextDefinition, FontSize} from './slides';

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

export function applyFontSize(text: TextDefinition, size: number): TextDefinition {
  const font: FontSize = {magnitude: size, unit: 'PT'};
  return {
    ...text,
    textRuns: text.textRuns.map(run => ({...run, fontSize: font})),
  };
}
