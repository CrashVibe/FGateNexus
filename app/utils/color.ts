import type { GlobalThemeOverrides } from "naive-ui";

/** tailwindcss 字体大小统一至 NaiveUI */
const componentThemeOverrides: GlobalThemeOverrides = {
  DataTable: {
    fontSizeSmall: "12px",
    fontSizeMedium: "14px",
    fontSizeLarge: "14px",
    thFontWeight: "500"
  },
  Form: {
    labelFontSizeTopSmall: "12px",
    labelFontSizeTopMedium: "14px",
    labelFontSizeTopLarge: "14px",
    labelFontSizeLeftSmall: "12px",
    labelFontSizeLeftMedium: "14px",
    labelFontSizeLeftLarge: "14px",
    feedbackFontSizeSmall: "12px",
    feedbackFontSizeMedium: "12px",
    feedbackFontSizeLarge: "14px"
  },
  Input: {
    fontSizeSmall: "12px",
    fontSizeMedium: "14px",
    fontSizeLarge: "14px"
  },
  Button: {
    fontSizeSmall: "12px",
    fontSizeMedium: "14px",
    fontSizeLarge: "14px",
    fontSizeTiny: "12px"
  },
  Card: {
    fontSizeSmall: "14px",
    fontSizeMedium: "14px",
    fontSizeLarge: "14px",
    titleFontSizeSmall: "16px",
    titleFontSizeMedium: "18px",
    titleFontSizeLarge: "18px"
  },
  Tag: {
    fontSizeSmall: "12px",
    fontSizeMedium: "12px",
    fontSizeLarge: "14px"
  },
  Select: {
    fontSizeSmall: "12px",
    fontSizeMedium: "14px",
    fontSizeLarge: "14px"
  },
  Tabs: {
    tabFontSizeSmall: "12px",
    tabFontSizeMedium: "14px",
    tabFontSizeLarge: "14px"
  }
};

/** NaiveUI 主题 */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: "4px"
  },
  LoadingBar: {
    height: "4px"
  },
  ...componentThemeOverrides
};
