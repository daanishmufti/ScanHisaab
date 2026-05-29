import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { InteractionManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HelpWizard from "../components/HelpWizard";

// Global wizard state: auto-shows on the FIRST app launch (persisted), and any
// component can call useHelp().openHelp() (e.g. the burger menu's "Help" row).
const KEY = "scanhisaab.help.seen";
const HelpContext = createContext(null);

export function HelpProvider({ children }) {
  const [open, setOpen] = useState(false);

  // First-launch trigger: wait for the UI to settle (splash/fonts done + first
  // dashboard paint), then pop the wizard once. Persisted so it never re-fires.
  useEffect(() => {
    let cancelled = false;
    let handle = null;
    AsyncStorage.getItem(KEY).then((v) => {
      if (cancelled || v) return;
      const task = InteractionManager.runAfterInteractions(() => {
        // small cushion so the dashboard has a frame to render behind the modal
        handle = setTimeout(() => { if (!cancelled) setOpen(true); }, 350);
      });
      // older RN versions return undefined; newer ones return a cancellable task
      if (task && typeof task.cancel === "function") {
        return () => task.cancel();
      }
    }).catch(() => {});
    return () => { cancelled = true; if (handle) clearTimeout(handle); };
  }, []);

  const openHelp = useCallback(() => setOpen(true), []);
  const close = useCallback(() => {
    setOpen(false);
    AsyncStorage.setItem(KEY, "1").catch(() => {});
  }, []);

  return (
    <HelpContext.Provider value={{ openHelp }}>
      {children}
      <HelpWizard visible={open} onClose={close} />
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used within a HelpProvider");
  return ctx;
}
