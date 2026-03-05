import type { GlobalThemeOverrides } from "naive-ui";

/** tailwindcss 字体大小统一至 NaiveUI */
const componentThemeOverrides: GlobalThemeOverrides = {
  Button: {
    fontSizeLarge: "14px",
    fontSizeMedium: "14px",
    fontSizeSmall: "12px",
    fontSizeTiny: "12px",
  },
  Card: {
    fontSizeLarge: "14px",
    fontSizeMedium: "14px",
    fontSizeSmall: "14px",
    titleFontSizeLarge: "18px",
    titleFontSizeMedium: "18px",
    titleFontSizeSmall: "16px",
  },
  DataTable: {
    fontSizeLarge: "14px",
    fontSizeMedium: "14px",
    fontSizeSmall: "12px",
    thFontWeight: "500",
  },
  Form: {
    feedbackFontSizeLarge: "14px",
    feedbackFontSizeMedium: "12px",
    feedbackFontSizeSmall: "12px",
    labelFontSizeLeftLarge: "14px",
    labelFontSizeLeftMedium: "14px",
    labelFontSizeLeftSmall: "12px",
    labelFontSizeTopLarge: "14px",
    labelFontSizeTopMedium: "14px",
    labelFontSizeTopSmall: "12px",
  },
  Input: {
    fontSizeLarge: "14px",
    fontSizeMedium: "14px",
    fontSizeSmall: "12px",
  },
  Select: {
    fontSizeLarge: "14px",
    fontSizeMedium: "14px",
    fontSizeSmall: "12px",
  },
  Tabs: {
    tabFontSizeLarge: "14px",
    tabFontSizeMedium: "14px",
    tabFontSizeSmall: "12px",
  },
  Tag: {
    fontSizeLarge: "14px",
    fontSizeMedium: "12px",
    fontSizeSmall: "12px",
  },
};

/** NaiveUI 主题 */
export const themeOverrides: GlobalThemeOverrides = {
  LoadingBar: {
    height: "4px",
  },
  common: {
    borderRadius: "4px",
  },
  ...componentThemeOverrides,
};
