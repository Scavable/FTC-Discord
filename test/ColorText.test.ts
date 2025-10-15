import ColorText from '../src/utility/ColorText';

describe('ColorText.colorText', () => {
  it('should format message with only message (no styles)', () => {
    const result = ColorText.colorText('Hello');
    expect(result).toBe('ansi\n\u001b[mHello');
  });

  it('should format message with foreground color only', () => {
    const result = ColorText.colorText('Hi', undefined, undefined, ColorText.enums.foreground.green);
    expect(result).toBe('ansi\n\u001b[32mHi');
  });

  it('should format message with format + foreground', () => {
    const result = ColorText.colorText(
      'Bold Red',
      ColorText.enums.format.bold,
      undefined,
      ColorText.enums.foreground.red,
    );
    expect(result).toBe('ansi\n\u001b[1;31mBold Red');
  });

  it('should format message with format + background + foreground', () => {
    const result = ColorText.colorText(
      'Styled',
      ColorText.enums.format.underline,
      ColorText.enums.background.white,
      ColorText.enums.foreground.blue,
    );
    expect(result).toBe('ansi\n\u001b[2;47;34mStyled');
  });

  it('should not include background or format segments if undefined', () => {
    const result = ColorText.colorText('OnlyFG', undefined, undefined, 37);
    expect(result).toBe('ansi\n\u001b[37mOnlyFG');
  });
});
