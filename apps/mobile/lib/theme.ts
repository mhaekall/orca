export const Theme = {
  colors: {
    background: "#0a0812",
    surface: "#13111a",
    surface2: "#1f1c29", // Often used for cards/modals
    surfaceAlt: "#1a1825", // Subtle variation of surface2
    primary: "#0A84FF", // iOS blue
    danger: "#FF3B30", // iOS red
    dangerAlt: "#FF2D55", // iOS pink-red
    success: "#30D158", // iOS green
    successAlt: "#32D74B",
    warning: "#FFD60A", // iOS yellow
    warningAlt: "#FF9F0A", // iOS orange
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    textDim: "rgba(255,255,255,0.4)",
    border: "rgba(255,255,255,0.05)",
    borderHighlight: "rgba(255,255,255,0.1)",
  },
  typography: {
    weights: {
      regular: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
      black: "900" as const,
    }
  }
};
