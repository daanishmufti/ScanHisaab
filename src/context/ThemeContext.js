import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { palettes, DEFAULT_MODE } from "../theme";

// Android-only system navigation bar control (the bottom 3-button / gesture pill bar).
// Lazily required so iOS/web/Expo Go don't choke if the native module isn't present.
let NavigationBar = null;
if (Platform.OS === "android") {
  try { NavigationBar = require("expo-navigation-bar"); } catch { NavigationBar = null; }
}

const KEY = "scanhisaab.theme";
const ThemeContext = createContext(null);
export function ThemeProvider({
  children
}) {
  const [mode, setMode] = useState(DEFAULT_MODE);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(m => {
      if (m && palettes[m]) setMode(m);
    }).catch(() => {});
  }, []);
  // Sync the Android system nav bar (bottom 3-button / gesture bar) to the theme so it
  // doesn't stay default-white. Buttons go light on dark bg, dark on light bg. No-op on iOS.
  useEffect(() => {
    if (!NavigationBar) return;
    const p = palettes[mode] || palettes[DEFAULT_MODE];
    NavigationBar.setBackgroundColorAsync(p.colors.bg).catch(() => {});
    NavigationBar.setButtonStyleAsync(p.statusBar === "light" ? "light" : "dark").catch(() => {});
  }, [mode]);
  const changeMode = useCallback(m => {
    if (!palettes[m]) return;
    setMode(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, []);
  const value = useMemo(() => {
    const p = palettes[mode] || palettes[DEFAULT_MODE];
    return {
      mode,
      setMode: changeMode,
      colors: p.colors,
      gradients: p.gradients,
      bgGradient: p.bgGradient,
      statusBar: p.statusBar
    };
  }, [mode, changeMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
// Re-apply the system nav-bar color via expo-navigation-bar when a Modal becomes visible.
// Android Modals open in their own native Window — that Window has its own nav bar that
// defaults to white and is NOT covered by the bar we set on the activity (or by the
// `navigationBarTranslucent` prop alone). Each modal-hosting component should call:
//   useSyncNavBar(myModalVisible)
// A 60ms delay lets the modal's window become foreground before we target it.
export function useSyncNavBar(visible) {
  const { colors, statusBar } = useTheme();
  useEffect(() => {
    if (!visible || !NavigationBar) return;
    const t = setTimeout(() => {
      NavigationBar.setBackgroundColorAsync(colors.bg).catch(() => {});
      NavigationBar.setButtonStyleAsync(statusBar === "light" ? "light" : "dark").catch(() => {});
    }, 60);
    return () => clearTimeout(t);
  }, [visible, colors.bg, statusBar]);
}

export function useThemedStyles(factory) {
  const {
    colors
  } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}