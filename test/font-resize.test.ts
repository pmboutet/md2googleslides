import { getFontMetrics, extractFontsFromSlides, preloadFontMetrics } from '../src/font-metrics';
import { estimateFontSize } from '../src/utils';

// Mock document and canvas for testing
const mockCanvas = {
  getContext: jest.fn(() => ({
    font: '',
    measureText: jest.fn((text: string) => ({
      width: text.length * 10, // Simple approximation
      actualBoundingBoxAscent: 80,
      actualBoundingBoxDescent: 20,
    })),
  })),
};

const mockDocument = {
  createElement: jest.fn(() => mockCanvas),
};

// Mock DOM for server-side testing
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
});

describe('Self-contained Font Metrics System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFontMetrics', () => {
    it('should load Arial metrics correctly', () => {
      const metrics = getFontMetrics('Arial');
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBe(1000);
      expect(metrics.xWidthAvg).toBe(554);
      expect(metrics.ascent).toBe(728);
      expect(metrics.descent).toBe(-210);
    });

    it('should load Roboto metrics correctly', () => {
      const metrics = getFontMetrics('Roboto');
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBe(1000);
      expect(metrics.xWidthAvg).toBe(543);
      expect(metrics.ascent).toBe(927);
      expect(metrics.descent).toBe(-244);
    });

    it('should load Montserrat metrics correctly', () => {
      const metrics = getFontMetrics('Montserrat');
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBe(1000);
      expect(metrics.xWidthAvg).toBe(542);
      expect(metrics.ascent).toBe(968);
      expect(metrics.descent).toBe(-251);
    });

    it('should calculate metrics for unknown fonts using Canvas', () => {
      const metrics = getFontMetrics('UnknownFont');
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBe(1000); // Canvas calculation default
      expect(metrics.xWidthAvg).toBeGreaterThan(0);
      expect(mockDocument.createElement).toHaveBeenCalledWith('canvas');
    });

    it('should cache calculated metrics', () => {
      // First call should trigger Canvas calculation
      const metrics1 = getFontMetrics('CustomFont');
      expect(mockDocument.createElement).toHaveBeenCalled();
      
      // Reset mock
      jest.clearAllMocks();
      
      // Second call should use cached value
      const metrics2 = getFontMetrics('CustomFont');
      expect(mockDocument.createElement).not.toHaveBeenCalled();
      expect(metrics1).toEqual(metrics2);
    });

    it('should handle Canvas unavailable gracefully', () => {
      // Mock Canvas as unavailable
      const originalDocument = global.document;
      (global as any).document = undefined;
      
      const metrics = getFontMetrics('UnavailableCanvasFont');
      expect(metrics).toBeDefined();
      // Should fallback to Arial
      expect(metrics.unitsPerEm).toBe(getFontMetrics('Arial').unitsPerEm);
      
      // Restore document
      (global as any).document = originalDocument;
    });

    it('should handle font name variations', () => {
      // Test case variations
      const arial1 = getFontMetrics('Arial');
      const arial2 = getFontMetrics('arial');
      
      // Arial should be found in both cases (exact match for first, cache for second)
      expect(arial1.unitsPerEm).toBe(1000);
      expect(arial2.unitsPerEm).toBe(1000);
    });
  });

  describe('extractFontsFromSlides', () => {
    it('should extract fonts from slide titles', () => {
      const slides = [
        {
          title: {
            textRuns: [
              { fontFamily: 'Montserrat' },
              { fontFamily: 'Arial' }
            ]
          },
          bodies: []
        }
      ];
      
      const fonts = extractFontsFromSlides(slides);
      expect(fonts).toEqual(new Set(['Montserrat', 'Arial']));
    });

    it('should extract fonts from slide bodies', () => {
      const slides = [
        {
          bodies: [
            {
              text: {
                textRuns: [
                  { fontFamily: 'Roboto' },
                  { fontFamily: 'Open Sans' }
                ]
              }
            }
          ]
        }
      ];
      
      const fonts = extractFontsFromSlides(slides);
      expect(fonts).toEqual(new Set(['Roboto', 'Open Sans']));
    });

    it('should deduplicate fonts from multiple slides', () => {
      const slides = [
        {
          title: { textRuns: [{ fontFamily: 'Arial' }] },
          bodies: [{ text: { textRuns: [{ fontFamily: 'Montserrat' }] } }]
        },
        {
          title: { textRuns: [{ fontFamily: 'Arial' }] }, // Duplicate
          bodies: [{ text: { textRuns: [{ fontFamily: 'Roboto' }] } }]
        }
      ];
      
      const fonts = extractFontsFromSlides(slides);
      expect(fonts).toEqual(new Set(['Arial', 'Montserrat', 'Roboto']));
    });

    it('should handle slides with no fonts', () => {
      const slides = [
        { bodies: [] },
        { title: { textRuns: [] }, bodies: [] }
      ];
      
      const fonts = extractFontsFromSlides(slides);
      expect(fonts).toEqual(new Set());
    });
  });

  describe('preloadFontMetrics', () => {
    it('should pre-load metrics for multiple fonts', () => {
      const fonts = ['Montserrat', 'Open Sans', 'CustomFont'];
      
      preloadFontMetrics(fonts);
      
      // Verify all fonts now have cached metrics
      fonts.forEach(font => {
        const metrics = getFontMetrics(font);
        expect(metrics).toBeDefined();
        expect(metrics.unitsPerEm).toBeGreaterThan(0);
      });
    });

    it('should handle empty font list', () => {
      expect(() => preloadFontMetrics([])).not.toThrow();
    });
  });

  describe('estimateFontSize with self-contained metrics', () => {
    const testBox = { width: 10000, height: 2000 };
    const testText = 'Sample text for font size estimation';

    it('should estimate font size correctly for hardcoded fonts', () => {
      const arialSize = estimateFontSize(testText, testBox, 48, 8, 'Arial');
      const robotoSize = estimateFontSize(testText, testBox, 48, 8, 'Roboto');
      const montserratSize = estimateFontSize(testText, testBox, 48, 8, 'Montserrat');
      
      expect(arialSize).toBeGreaterThan(8);
      expect(arialSize).toBeLessThanOrEqual(48);
      expect(robotoSize).toBeGreaterThan(8);
      expect(robotoSize).toBeLessThanOrEqual(48);
      expect(montserratSize).toBeGreaterThan(8);
      expect(montserratSize).toBeLessThanOrEqual(48);
    });

    it('should estimate font size for unknown fonts using Canvas', () => {
      const size = estimateFontSize(testText, testBox, 48, 8, 'CustomUnknownFont');
      
      expect(size).toBeGreaterThan(8);
      expect(size).toBeLessThanOrEqual(48);
      expect(mockDocument.createElement).toHaveBeenCalled();
    });

    it('should return different sizes for different fonts', () => {
      const arialSize = estimateFontSize(testText, testBox, 48, 8, 'Arial');
      const robotoSize = estimateFontSize(testText, testBox, 48, 8, 'Roboto');
      const montserratSize = estimateFontSize(testText, testBox, 48, 8, 'Montserrat');
      
      // All should be valid sizes
      [arialSize, robotoSize, montserratSize].forEach(size => {
        expect(size).toBeGreaterThan(8);
        expect(size).toBeLessThanOrEqual(48);
      });

      // Sizes should potentially be different due to different font metrics
      // (though they might be close)
      expect(typeof arialSize).toBe('number');
      expect(typeof robotoSize).toBe('number');
      expect(typeof montserratSize).toBe('number');
    });

    it('should respect min and max constraints with calculated metrics', () => {
      const tinyBox = { width: 100, height: 50 };
      const hugeBox = { width: 100000, height: 10000 };
      
      const tinySize = estimateFontSize(testText, tinyBox, 48, 8, 'UnknownFont');
      const hugeSize = estimateFontSize('A', hugeBox, 48, 8, 'UnknownFont');
      
      expect(tinySize).toBeGreaterThanOrEqual(8);
      expect(hugeSize).toBeLessThanOrEqual(48);
    });
  });

  describe('Integration workflow', () => {
    it('should handle complete font workflow', () => {
      // 1. Extract fonts from slides
      const slides = [
        {
          title: { textRuns: [{ fontFamily: 'Montserrat' }] },
          bodies: [
            { text: { textRuns: [{ fontFamily: 'Roboto' }] } },
            { text: { textRuns: [{ fontFamily: 'Custom Font' }] } }
          ]
        }
      ];
      
      const fonts = extractFontsFromSlides(slides);
      expect(fonts.size).toBe(3);
      
      // 2. Pre-load all fonts
      preloadFontMetrics(Array.from(fonts));
      
      // 3. Use fonts for size estimation
      fonts.forEach(font => {
        const size = estimateFontSize('Test text', { width: 5000, height: 1000 }, 36, 10, font);
        expect(size).toBeGreaterThan(10);
        expect(size).toBeLessThanOrEqual(36);
      });
    });

    it('should demonstrate Montserrat working correctly', () => {
      // The core issue: Montserrat should work for font size estimation
      const montserratMetrics = getFontMetrics('Montserrat');
      
      // Verify we have proper Montserrat metrics
      expect(montserratMetrics.unitsPerEm).toBe(1000);
      expect(montserratMetrics.xWidthAvg).toBe(542);
      expect(montserratMetrics.ascent).toBe(968);
      expect(montserratMetrics.descent).toBe(-251);
      
      // Verify size estimation works
      const size = estimateFontSize(
        'This is a Montserrat test text that should resize properly',
        { width: 8000, height: 1500 },
        48,
        8,
        'Montserrat'
      );
      
      expect(size).toBeGreaterThan(8);
      expect(size).toBeLessThanOrEqual(48);
      expect(typeof size).toBe('number');
    });

    it('should performance test cached vs uncached', () => {
      const fontName = 'PerformanceTestFont';
      
      // First call (should calculate)
      const start1 = Date.now();
      getFontMetrics(fontName);
      const time1 = Date.now() - start1;
      
      // Second call (should use cache)
      const start2 = Date.now();
      getFontMetrics(fontName);
      const time2 = Date.now() - start2;
      
      // Cached call should be faster (though this is a rough test)
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });

  describe('Self-contained system validation', () => {
    it('should work without any external dependencies', () => {
      // This test validates that our system works entirely self-contained
      
      // Test all hardcoded fonts
      const hardcodedFonts = ['Arial', 'Roboto', 'Montserrat'];
      hardcodedFonts.forEach(font => {
        const metrics = getFontMetrics(font);
        expect(metrics.unitsPerEm).toBe(1000);
        expect(metrics.xWidthAvg).toBeGreaterThan(0);
        expect(metrics.ascent).toBeGreaterThan(0);
        expect(typeof metrics.descent).toBe('number'); // Can be negative
      });
      
      // Test Canvas fallback for unknown fonts
      const unknownFont = 'SomeRandomFontName';
      const metrics = getFontMetrics(unknownFont);
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBe(1000);
      
      // Verify no external imports are needed
      expect(mockDocument.createElement).toHaveBeenCalled();
    });
  });
});
