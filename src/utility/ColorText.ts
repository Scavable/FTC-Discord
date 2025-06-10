class ColorText {
  public static colorText(
    message: string,
    format?: number,
    background?: number,
    foreground?: number,
  ): string {
    let coloredText = `ansi\n[`;
    if (format) coloredText += `${format};`;
    if (background) coloredText += `${background};`;
    if (foreground) coloredText += `${foreground}`;
    coloredText += `m${message}`;
    return coloredText;
  }

  static enums = {
    format: {
      normal: 0,
      bold: 1,
      underline: 2,
    },
    background: {
      fire_fly_dark_blue: 40,
      orange: 41,
      marble_blue: 42,
      greyish_turquoise: 43,
      gray: 44,
      indigo: 45,
      light_gray: 46,
      white: 47,
    },
    foreground: {
      gray: 30,
      red: 31,
      green: 32,
      yellow: 33,
      blue: 34,
      pink: 35,
      cyan: 36,
      white: 37,
    },
  };
}

export default ColorText;
