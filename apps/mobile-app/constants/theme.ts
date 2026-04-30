/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Garden app color palette
export const GardenColors = {
  bgRoot: '#07140c',
  bgSurface: 'rgba(17, 40, 24, 0.92)',
  bgSurfaceSoft: 'rgba(21, 56, 33, 0.86)',
  accent: '#d9ff6a',
  accentSoft: 'rgba(217, 255, 106, 0.2)',
  textPrimary: '#f7f8f4',
  textMuted: '#c0c7b8',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  success: '#4ade80',
  warning: '#f59e0b',
  error: '#ef4444',
  cardBg: 'rgba(17, 40, 24, 0.85)',
  cardBorder: 'rgba(190, 255, 171, 0.14)',
};

export const Colors = {
  light: {
    text: GardenColors.textPrimary,
    background: GardenColors.bgRoot,
    tint: GardenColors.accent,
    icon: GardenColors.textMuted,
    tabIconDefault: GardenColors.textMuted,
    tabIconSelected: GardenColors.accent,
  },
  dark: {
    text: GardenColors.textPrimary,
    background: GardenColors.bgRoot,
    tint: GardenColors.accent,
    icon: GardenColors.textMuted,
    tabIconDefault: GardenColors.textMuted,
    tabIconSelected: GardenColors.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
