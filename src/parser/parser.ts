// Copyright 2019 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import markdownIt from 'markdown-it';
type Token = any;

// Use require for plugins to ensure proper loading since some don't have proper ES module exports
const attrs = require('markdown-it-attrs');
const lazyHeaders = require('markdown-it-lazy-headers');
const { light: emoji } = require('markdown-it-emoji');
const expandTabs = require('markdown-it-expand-tabs');
const video = require('markdown-it-video');

// Custom fence plugin implementation to replace markdown-it-fence
function generatedImageFence(md: any, name: string, options: any) {
  const marker = options.marker || '$';
  const validate = options.validate || (() => true);
  
  function fence(state: any, start: number, end: number, silent: boolean) {
    let pos, nextLine, markup, params, token, mem;
    let haveEndMarker = false;

    // Check out the first character quickly, which should filter out most of non-containers
    if (marker !== state.src[start]) { return false; }

    // Check out the rest of the marker string
    for (pos = start + 1; pos <= 3; pos++) {
      if (state.src[pos] !== marker) {
        break;
      }
    }

    markup = state.src.slice(start, pos);
    params = state.src.slice(pos, state.eMarks[start]).trim();

    // Since start is found, we can report success here in validation mode
    if (silent) { return true; }

    // Search for end marker
    nextLine = start;

    for (;;) {
      nextLine++;
      if (nextLine >= end) {
        // unclosed block should be autoclosed by end of document.
        break;
      }

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      let max = state.eMarks[nextLine];

      if (pos < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list
        break;
      }

      if (state.src.slice(pos, max).trim().slice(0, markup.length) === markup) {
        // closing fence marker found
        mem = state.src.slice(pos, max);
        pos += markup.length;
        if (pos <= max) {
          pos = state.skipSpaces(pos);
          if (pos < max) {
            if (mem.slice(markup.length).trim() !== '') {
              continue;
            }
          }
        }
        // make sure tail has spaces only
        pos = state.skipSpaces(pos);
        if (pos < max) {
          continue;
        }

        // found!
        haveEndMarker = true;
        break;
      }
    }

    const oldParent = state.parentType;
    const oldLineMax = state.lineMax;
    state.parentType = name;

    // this will prevent lazy continuations from ever going past our end marker
    state.lineMax = nextLine;

    token = state.push(name, 'div', 0);
    token.markup = markup;
    token.block = true;
    token.info = params;
    token.map = [start, nextLine];
    token.content = state.src.slice(state.bMarks[start + 1], state.bMarks[nextLine - (haveEndMarker ? 1 : 0)]);

    state.parentType = oldParent;
    state.lineMax = oldLineMax;
    state.line = nextLine + (haveEndMarker ? 1 : 0);

    return true;
  }

  md.block.ruler.before('fence', name, fence, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });
}

function generatedImage(md: any): void {
  return generatedImageFence(md, 'generated_image', {
    marker: '$',
    validate: () => true,
  });
}

const mdOptions = {
  html: true,
  langPrefix: 'highlight ',
  linkify: false,
  breaks: false,
};

const parser = markdownIt(mdOptions)
  .use(attrs)
  .use(lazyHeaders)
  .use(emoji, {shortcuts: {}})
  .use(expandTabs, {tabWidth: 4})
  .use(generatedImage)
  .use(video, {youtube: {width: 640, height: 390}});

function parseMarkdown(markdown: string): Token[] {
  return parser.parse(markdown, {});
}

export default parseMarkdown;
