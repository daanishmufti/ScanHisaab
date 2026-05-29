const dark = {
  colors: {
    bg: "#0E0A18",
    surface: "#19122C",
    surface2: "#231A3C",
    muted: "#2A2046",
    border: "#352B52",
    fg: "#F6F4FC",
    fgMuted: "#A89FC2",
    primary: "#9B6BF5",
    primaryHover: "#AD86F8",
    primaryOn: "#FFFFFF",
    accent: "#B794F6",
    danger: "#F0556B",
    success: "#34D399"
  },
  gradients: {
    brand: ["#A87BF5", "#6D3FD4"],
    primary: ["#A87BF5", "#8048E8"],
    hero: ["#A879F6", "#6A38CF"]
  },
  bgGradient: ["#3B2568", "#1A1233", "#0B0916"],
  statusBar: "light"
};
const light = {
  colors: {
    bg: "#F6F3FC",
    surface: "#FFFFFF",
    surface2: "#F1ECF9",
    muted: "#ECE6F6",
    border: "#E2D9F0",
    fg: "#1E1730",
    fgMuted: "#6E6385",
    primary: "#7C4DE8",
    primaryHover: "#8B5CF0",
    primaryOn: "#FFFFFF",
    accent: "#7C4DE8",
    danger: "#E11D48",
    success: "#15A06A"
  },
  gradients: {
    brand: ["#9B6BF5", "#7C4DE8"],
    primary: ["#9B6BF5", "#7C4DE8"],
    hero: ["#9B6BF5", "#7C3AED"]
  },
  bgGradient: ["#E7DCFA", "#F2ECFB", "#FAF8FE"],
  statusBar: "dark"
};
export const palettes = {
  dark,
  light
};
export const DEFAULT_MODE = "dark";
export const THEME_OPTIONS = [{
  key: "dark",
  label: "Dark"
}, {
  key: "light",
  label: "Light"
}];
export const colors = {
  ...dark.colors
};
export const gradients = {
  ...dark.gradients
};
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999
};
export const space = n => n * 4;
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold"
};
export const shadow = (level = 1) => ({
  shadowColor: "#000",
  shadowOpacity: level >= 2 ? 0.35 : 0.2,
  shadowRadius: level >= 2 ? 16 : 8,
  shadowOffset: {
    width: 0,
    height: level >= 2 ? 8 : 4
  },
  elevation: level >= 2 ? 8 : 3
});