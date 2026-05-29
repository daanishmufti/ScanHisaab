import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getNotificationsEnabled, setNotificationsEnabled as apiSetNotificationsEnabled } from "../lib/api";
import { useTheme } from "./ThemeContext";
const OS_NOTIFICATIONS = Constants.executionEnvironment !== "storeClient";
let Notifications = null;
if (OS_NOTIFICATIONS) {
  try {
    Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false
      })
    });
  } catch {
    Notifications = null;
  }
}
const NotificationsContext = createContext(null);
const MAX = 50;
const KEY = "scanhisaab.notifications.local";
// Keys of alerts that have ALREADY fired (persisted, independent of the visible list).
// Clearing notifications does NOT reset this — so the same budget alert won't re-fire
// every time the app opens. Only an explicit clearAlertFor() (e.g. when you go back
// under the threshold) re-arms it.
const ALERT_KEY = "scanhisaab.budget.alerted";
export function NotificationsProvider({
  children
}) {
  const {
    colors
  } = useTheme();
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [enabled, setEnabledState] = useState(true);
  const [osPermission, setOsPermission] = useState(OS_NOTIFICATIONS && Notifications ? "undetermined" : "unsupported");
  const itemsRef = useRef([]);
  const canNotifyRef = useRef(false);
  const enabledRef = useRef(true);
  const colorsRef = useRef(colors);
  // Persistent "already-fired" alert keys + ready flag (loaded asynchronously from storage).
  const firedRef = useRef(new Set());
  const [alertsReady, setAlertsReady] = useState(false);
  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);
  useEffect(() => {
    let active = true;
    getNotificationsEnabled().then(v => {
      if (!active) return;
      enabledRef.current = v;
      setEnabledState(v);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  // Load the persistent set of already-fired alert keys.
  useEffect(() => {
    AsyncStorage.getItem(ALERT_KEY).then(raw => {
      try { firedRef.current = new Set(raw ? JSON.parse(raw) : []); } catch {}
      setAlertsReady(true);
    }).catch(() => setAlertsReady(true));
  }, []);
  const setEnabled = useCallback(async v => {
    const next = !!v;
    enabledRef.current = next;
    setEnabledState(next);
    await apiSetNotificationsEnabled(next).catch(() => {});
    if (next && OS_NOTIFICATIONS && Notifications && !canNotifyRef.current) {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        canNotifyRef.current = status === "granted";
        setOsPermission(status);
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (!OS_NOTIFICATIONS || !Notifications) return;
    let active = true;
    const sync = async allowPrompt => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("budget-alerts", {
            name: "Budget alerts",
            importance: Notifications.AndroidImportance.HIGH,
            sound: "default"
          });
        }
        let {
          status
        } = await Notifications.getPermissionsAsync();
        if (allowPrompt && status !== "granted") ({
          status
        } = await Notifications.requestPermissionsAsync());
        if (active) {
          canNotifyRef.current = status === "granted";
          setOsPermission(status);
        }
      } catch {}
    };
    sync(true);
    // Re-detect when returning from Android notification settings
    const sub = AppState.addEventListener("change", s => {
      if (s === "active") sync(false);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  const persist = useCallback(next => {
    itemsRef.current = next;
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);
  const reload = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      itemsRef.current = parsed;
      setItems(parsed);
    } catch {}
  }, []);
  const mutate = useCallback(async transform => {
    let stored = [];
    try {
      const raw = await AsyncStorage.getItem(KEY);
      stored = raw ? JSON.parse(raw) : [];
    } catch {}
    const next = transform(stored).slice(0, MAX);
    persist(next);
    return next;
  }, [persist]);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", s => {
      if (s === "active") reload();
    });
    return () => sub.remove();
  }, [reload]);
  const add = useCallback(async ({
    key,
    type,
    title,
    body
  }) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      key,
      type,
      title,
      body,
      createdAt: Date.now(),
      read: false
    };
    if (!enabledRef.current) return;
    await mutate(stored => {
      if (key && stored.some(n => n.key === key)) return stored;
      return [item, ...stored];
    });
    // History is still deduped by key, but the in-app banner AND the Android OS
    // push always fire so the user gets feedback on every trigger.
    setToast(item);
    if (OS_NOTIFICATIONS && Notifications && canNotifyRef.current) {
      const tint = type === "budget_exceeded" ? colorsRef.current.danger : colorsRef.current.primary;
      Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          color: tint,
          priority: Notifications.AndroidNotificationPriority?.HIGH
        },
        // channelId-only trigger = fire immediately on Android (matches the in-app banner timing).
        trigger: {
          channelId: "budget-alerts"
        }
      }).catch(() => {});
    }
  }, [mutate]);
  // Fire an alert AT MOST ONCE per key — across launches, across clearAll, until the
  // condition reverses (caller invokes clearAlertFor to re-arm). Stops budget alerts from
  // re-firing on every dashboard mount when the user has cleared the notification list.
  const persistFired = useCallback(() => {
    AsyncStorage.setItem(ALERT_KEY, JSON.stringify([...firedRef.current])).catch(() => {});
  }, []);
  const notifyOnce = useCallback(async payload => {
    if (!alertsReady) return;
    const k = payload?.key;
    if (k && firedRef.current.has(k)) return;
    if (k) { firedRef.current.add(k); persistFired(); }
    await add(payload);
  }, [alertsReady, add, persistFired]);
  const clearAlertFor = useCallback(key => {
    if (!key || !firedRef.current.has(key)) return;
    firedRef.current.delete(key);
    persistFired();
  }, [persistFired]);
  const markAllRead = useCallback(() => {
    if (!itemsRef.current.some(n => !n.read)) return;
    mutate(stored => stored.map(n => ({
      ...n,
      read: true
    })));
  }, [mutate]);
  const clearAll = useCallback(() => mutate(() => []), [mutate]);
  const clearToast = useCallback(() => setToast(null), []);
  const unread = items.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
  return <NotificationsContext.Provider value={{
    items,
    unread,
    add,
    notifyOnce,
    clearAlertFor,
    alertsReady,
    markAllRead,
    clearAll,
    toast,
    clearToast,
    enabled,
    setEnabled,
    osPermission
  }}>
      {children}
    </NotificationsContext.Provider>;
}
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}