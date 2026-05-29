import { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, Switch, Linking, Platform } from "react-native";
import { Menu, Trash2, Coins, Check, ShieldCheck, Palette, Bell, ExternalLink, HelpCircle } from "lucide-react-native";
import Constants from "expo-constants";
import { fonts, radius, shadow } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
import { useHelp } from "../context/HelpContext";
import { useNotifications } from "../context/NotificationsContext";
import { useAppAlert } from "./AlertProvider";
import ConfirmDialog from "./ConfirmDialog";
import { clearAllData, clearAllReceipts, getDefaultCurrency, setDefaultCurrency } from "../lib/api";
const CURRENCIES = ["PKR", "USD", "GBP", "EUR", "INR", "AED", "SAR"];
export default function MenuButton() {
  const {
    colors,
    mode,
    setMode
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { openHelp } = useHelp();
  const {
    enabled: notifEnabled,
    setEnabled: setNotifEnabled,
    osPermission
  } = useNotifications();
  const { alert } = useAppAlert();
  const osBlocked = notifEnabled && osPermission && osPermission !== "granted" && osPermission !== "unsupported";
  const openOSNotifSettings = async () => {
    setOpen(false);
    if (Platform.OS === "android") {
      const pkg = Constants.expoConfig?.android?.package;
      if (pkg) {
        try {
          await Linking.sendIntent("android.settings.APP_NOTIFICATION_SETTINGS", [{
            key: "android.provider.extra.APP_PACKAGE",
            value: pkg
          }]);
          return;
        } catch {}
      }
    }
    Linking.openSettings().catch(() => {});
  };
  const [open, setOpen] = useState(false);
  const [curOpen, setCurOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmAllTx, setConfirmAllTx] = useState(false);
  const [currency, setCurrency] = useState("PKR");
  useSyncNavBar(open || curOpen);
  const openMenu = () => {
    getDefaultCurrency().then(setCurrency).catch(() => {});
    setOpen(true);
  };
  const pickCurrency = async c => {
    setCurrency(c);
    setCurOpen(false);
    await setDefaultCurrency(c).catch(() => {});
  };
  const doClear = async () => {
    setConfirmClear(false);
    setOpen(false);
    try {
      await clearAllData();
      alert("Data cleared", "All receipts and budgets were deleted from this device.", null, { tone: "success" });
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    }
  };
  const doDeleteAllTx = async () => {
    setConfirmAllTx(false);
    setOpen(false);
    try {
      await clearAllReceipts();
      alert("Transactions deleted", "All receipts were removed. Your budgets are still here.", null, { tone: "success" });
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    }
  };
  return <>
      <Pressable onPress={openMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel="Menu" style={({
      pressed
    }) => [styles.btn, pressed && {
      opacity: 0.7
    }]}>
        <Menu size={24} color={colors.fg} />
      </Pressable>

      {}
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdropTop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.menu, shadow(2)]} onPress={() => {}}>
            <Text style={styles.sectionLabel}>Preferences</Text>
            <Pressable onPress={() => setMode(mode === "dark" ? "light" : "dark")} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
              <Palette size={18} color={colors.fg} />
              <Text style={styles.rowTxt}>Dark mode</Text>
              <Switch value={mode === "dark"} onValueChange={(v) => setMode(v ? "dark" : "light")}
                trackColor={{ true: colors.primary, false: colors.muted }}
                thumbColor={Platform.OS === "android" ? (mode === "dark" ? colors.primaryOn : "#f4f4f4") : undefined} />
            </Pressable>
            <Pressable onPress={() => setNotifEnabled(!notifEnabled)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
              <Bell size={18} color={colors.fg} />
              <Text style={styles.rowTxt}>Notifications</Text>
              <Switch value={notifEnabled} onValueChange={setNotifEnabled}
                trackColor={{ true: colors.primary, false: colors.muted }}
                thumbColor={Platform.OS === "android" ? (notifEnabled ? colors.primaryOn : "#f4f4f4") : undefined} />
            </Pressable>
            {(notifEnabled || osBlocked) && (
              <Pressable onPress={openOSNotifSettings} style={({ pressed }) => [styles.subRow, pressed && { backgroundColor: colors.muted }]}>
                <ExternalLink size={14} color={osBlocked ? colors.danger : colors.fgMuted} />
                <Text style={[styles.subRowTxt, { color: osBlocked ? colors.danger : colors.fgMuted }]}>
                  {osBlocked
                    ? (Platform.OS === "android" ? "Android is blocking — tap to allow" : "System is blocking — tap to allow")
                    : (Platform.OS === "android" ? "Android notification settings" : "System notification settings")}
                </Text>
              </Pressable>
            )}
            <Pressable onPress={() => setCurOpen(true)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
              <Coins size={18} color={colors.fg} />
              <Text style={styles.rowTxt}>Default currency</Text>
              <Text style={styles.rowVal}>{currency}</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Help</Text>
            <Pressable onPress={() => { setOpen(false); openHelp(); }} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
              <HelpCircle size={18} color={colors.fg} />
              <Text style={styles.rowTxt}>Help &amp; tour</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable onPress={() => setConfirmAllTx(true)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
              <Trash2 size={18} color={colors.danger} />
              <Text style={[styles.rowTxt, { color: colors.danger }]}>Delete all transactions</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmClear(true)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
              <Trash2 size={18} color={colors.danger} />
              <Text style={[styles.rowTxt, { color: colors.danger }]}>Clear all data</Text>
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.aboutRow}>
              <ShieldCheck size={14} color={colors.fgMuted} />
              <Text style={styles.about}>On-device receipt scanner. Your data never leaves this phone.</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {}
      <Modal visible={curOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCurOpen(false)}>
        <Pressable style={styles.backdropCenter} onPress={() => setCurOpen(false)}>
          <Pressable style={[styles.sheet, shadow(2)]} onPress={() => {}}>
            <Text style={styles.heading}>Default currency</Text>
            {CURRENCIES.map(c => {
            const active = c === currency;
            return <Pressable key={c} onPress={() => pickCurrency(c)} style={({
              pressed
            }) => [styles.curOpt, pressed && {
              backgroundColor: colors.muted
            }]}>
                  <Text style={[styles.curTxt, active && {
                color: colors.primary,
                fontFamily: fonts.semibold
              }]}>{c}</Text>
                  {active && <Check size={18} color={colors.primary} />}
                </Pressable>;
          })}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog visible={confirmAllTx} destructive icon={Trash2} title="Delete all transactions?" message="This permanently removes every receipt on this device. Budgets and settings are kept." confirmLabel="Delete all" onConfirm={doDeleteAllTx} onCancel={() => setConfirmAllTx(false)} />

      <ConfirmDialog visible={confirmClear} destructive icon={Trash2} title="Clear all data?" message="This permanently deletes every receipt and budget stored on this device. This can't be undone." confirmLabel="Clear everything" onConfirm={doClear} onCancel={() => setConfirmClear(false)} />
    </>;
}
const makeStyles = colors => StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  backdropTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingTop: 90,
    paddingHorizontal: 16,
    alignItems: "flex-end"
  },
  backdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  menu: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10
  },
  title: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 18,
    paddingHorizontal: 8,
    paddingTop: 6
  },
  subtitle: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    paddingHorizontal: 8,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8
  },
  sectionLabel: {
    color: colors.fgMuted,
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 2
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: radius.md
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 38,
    paddingRight: 8,
    borderRadius: radius.md,
    marginTop: -2
  },
  subRowTxt: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    flex: 1
  },
  rowTxt: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 15,
    flex: 1
  },
  rowVal: {
    color: colors.fgMuted,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  aboutRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    paddingHorizontal: 8,
    paddingBottom: 6
  },
  about: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    flex: 1
  },
  sheet: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12
  },
  heading: {
    color: colors.fgMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingVertical: 8
  },
  curOpt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.md
  },
  curTxt: {
    color: colors.fg,
    fontFamily: fonts.regular,
    fontSize: 16
  }
});