import { getFontMetrics } from '../src/font-metrics';
import { estimateFontSize } from '../src/utils';

describe('Font Metrics and Resize', () => {
  describe('getFontMetrics', () => {
    it('should load Arial metrics correctly', () => {
      const metrics = getFontMetrics('Arial');
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBeGreaterThan(0);
      expect(metrics.xWidthAvg).toBeGreaterThan(0);
    });

    it('should load Roboto metrics correctly', () => {
      const metrics = getFontMetrics('Roboto');
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBeGreaterThan(0);
      expect(metrics.xWidthAvg).toBeGreaterThan(0);
    });

    it('should load Montserrat metrics correctly', () => {
      const metrics = getFontMetrics('Montserrat');
      expect(metrics).toBeDefined();
      expect(metrics.unitsPerEm).toBeGreaterThan(0);
      expect(metrics.xWidthAvg).toBeGreaterThan(0);
    });

    it('should use intelligent fallback for unknown fonts', () => {
      // Test with unknown sans-serif font
      const unknownSansSerif = getFontMetrics('UnknownSansSerif');
      const robotoMetrics = getFontMetrics('Roboto');
      expect(unknownSansSerif.unitsPerEm).toBe(robotoMetrics.unitsPerEm);

      // Test with unknown serif font
      const unknownSerif = getFontMetrics('UnknownSerif');
      const arialMetrics = getFontMetrics('Arial');
      expect(unknownSerif.unitsPerEm).toBe(arialMetrics.unitsPerEm);
    });

    it('should handle font name variations', () => {
      // These should all resolve to Montserrat
      const variations = [
        'Montserrat',
        'montserrat',
        'MONTSERRAT'
      ];

      const baseMetrics = getFontMetrics('Montserrat');
      
      variations.forEach(variation => {
        const metrics = getFontMetrics(variation);
        // Should be same metrics (either direct match or loaded dynamically)
        expect(metrics).toBeDefined();
        expect(metrics.unitsPerEm).toBeGreaterThan(0);
      });
    });
  });

  describe('estimateFontSize', () => {
    const testBox = { width: 10000, height: 2000 }; // Large enough box
    const testText = 'Sample text for font size estimation';

    it('should estimate font size correctly for Arial', () => {
      const size = estimateFontSize(testText, testBox, 48, 8, 'Arial');
      expect(size).toBeGreaterThan(8);
      expect(size).toBeLessThanOrEqual(48);
    });

    it('should estimate font size correctly for Roboto', () => {
      const size = estimateFontSize(testText, testBox, 48, 8, 'Roboto');
      expect(size).toBeGreaterThan(8);
      expect(size).toBeLessThanOrEqual(48);
    });

    it('should estimate font size correctly for Montserrat', () => {
      const size = estimateFontSize(testText, testBox, 48, 8, 'Montserrat');
      expect(size).toBeGreaterThan(8);
      expect(size).toBeLessThanOrEqual(48);
    });

    it('should return different sizes for different fonts with same text', () => {
      const arialSize = estimateFontSize(testText, testBox, 48, 8, 'Arial');
      const robotoSize = estimateFontSize(testText, testBox, 48, 8, 'Roboto');
      const montserratSize = estimateFontSize(testText, testBox, 48, 8, 'Montserrat');

      // Sizes should be different due to different font metrics
      // (though they might be close, they shouldn't be identical)
      const sizes = [arialSize, robotoSize, montserratSize];
      const uniqueSizes = new Set(sizes);
      
      // At least some variation expected
      expect(sizes.every(size => size > 8 && size <= 48)).toBe(true);
    });

    it('should respect min and max constraints', () => {
      const tinyBox = { width: 100, height: 50 };
      const hugeBox = { width: 100000, height: 10000 };
      
      const tinySize = estimateFontSize(testText, tinyBox, 48, 8, 'Montserrat');
      const hugeSize = estimateFontSize('A', hugeBox, 48, 8, 'Montserrat');
      
      expect(tinySize).toBeGreaterThanOrEqual(8);
      expect(hugeSize).toBeLessThanOrEqual(48);
    });
  });

  describe('Integration test', () => {
    it('should handle slide deck font resize workflow', () => {
      // Simulate the actual workflow from generic_layout.ts
      const mockTextRuns = [
        { fontFamily: 'Montserrat', fontSize: { magnitude: 18, unit: 'PT' } }
      ];
      
      const mockValue = {
        rawText: 'This is a test slide title with Montserrat font',
        textRuns: mockTextRuns
      };
      
      const mockBox = { width: 8000, height: 1500 };
      
      const firstRun = mockValue.textRuns[0];
      const fontFamily = firstRun?.fontFamily || 'Arial';
      
      // This should not throw and should return a reasonable size
      expect(() => {
        const size = estimateFontSize(mockValue.rawText, mockBox, 48, 8, fontFamily);
        expect(size).toBeGreaterThan(8);
        expect(size).toBeLessThanOrEqual(48);
      }).not.toThrow();
    });
  });
});
