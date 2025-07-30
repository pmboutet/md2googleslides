import {expect} from 'chai';
import {estimateFontSize, emuToPoints} from '../src/utils';
import {measureWrappedText} from '../src/text-measurement';

describe('estimateFontSize', () => {
  it('fits text inside the box', () => {
    const text = 'hello world '.repeat(20);
    const box = {width: 5000000, height: 2000000};
    const size = estimateFontSize(text, box, 48, 8);
    const {width, height} = measureWrappedText(text, size, emuToPoints(box.width));
    expect(width).to.be.at.most(emuToPoints(box.width) + 0.01);
    expect(height).to.be.at.most(emuToPoints(box.height) + 0.01);
  });
});
