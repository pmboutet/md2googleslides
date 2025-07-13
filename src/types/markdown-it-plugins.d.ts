// Type declarations for markdown-it plugins without proper TypeScript support

declare module 'markdown-it-attrs' {
  import MarkdownIt from 'markdown-it';

  interface AttrsOptions {
    leftDelimiter?: string;
    rightDelimiter?: string;
    allowedAttributes?: string[];
  }

  function attrs(md: MarkdownIt, options?: AttrsOptions): void;
  export = attrs;
}

declare module 'markdown-it-lazy-headers' {
  import MarkdownIt from 'markdown-it';

  function lazyHeaders(md: MarkdownIt): void;
  export = lazyHeaders;
}

declare module 'markdown-it-emoji' {
  import MarkdownIt from 'markdown-it';

  interface EmojiOptions {
    defs?: Record<string, string>;
    shortcuts?: Record<string, string>;
    enabled?: string[];
  }

  function emoji(md: MarkdownIt, options?: EmojiOptions): void;
  export = emoji;
}

declare module 'markdown-it-expand-tabs' {
  import MarkdownIt from 'markdown-it';

  interface ExpandTabsOptions {
    tabWidth?: number;
  }

  function expandTabs(md: MarkdownIt, options?: ExpandTabsOptions): void;
  export = expandTabs;
}

declare module 'markdown-it-video' {
  import MarkdownIt from 'markdown-it';

  interface VideoOptions {
    youtube?: {
      width?: number;
      height?: number;
    };
    vimeo?: {
      width?: number;
      height?: number;
    };
  }

  function video(md: MarkdownIt, options?: VideoOptions): void;
  export = video;
}
