import { createContext, useContext, useState, useCallback } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Info, TriangleAlert, CircleCheck } from "lucide-react-native";
import { fonts, radius, shadow } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
const AlertContext = createContext(null);
export function AlertProvider({
  children
}) {
  const [state, setState] = useState(null);
  const styles = useThemedStyles(makeStyles);
  const {
    colors
  } = useTheme();
  const alert = useCallback((title, message, buttons, options = {}) => {
    setState({
      title,
      message,
      buttons: buttons && buttons.length ? buttons : [{
        text: "OK"
      }],
      icon: options.icon,
      tone: options.tone || (buttons && buttons.some(b => b.style === "destructive") ? "destructive" : "info")
    });
  }, []);
  const dismiss = useCallback(() => setState(null), []);
  const handleBtn = btn => {
    dismiss();
    if (btn.onPress) setTimeout(() => btn.onPress(), 60);
  };
  const visible = !!state;
  useSyncNavBar(visible);
  const tone = state?.tone || "info";
  const tint = tone === "error" || tone === "destructive" ? colors.danger : tone === "success" ? colors.success : colors.primary;
  const Icon = state?.icon || (tone === "error" || tone === "destructive" ? TriangleAlert : tone === "success" ? CircleCheck : Info);
  const btns = state?.buttons || [];
  const stack = btns.length > 2;
  return <AlertContext.Provider value={{
    alert
  }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable style={[styles.card, shadow(2)]} onPress={() => {}}>
            <View style={[styles.iconCircle, {
            backgroundColor: `${tint}22`
          }]}>
              <Icon size={26} color={tint} />
            </View>
            <Text style={styles.title}>{state?.title}</Text>
            {state?.message ? <Text style={styles.message}>{state.message}</Text> : null}
            <View style={[styles.row, stack && styles.stack]}>
              {btns.map((btn, i) => {
              const isCancel = btn.style === "cancel";
              const isDestructive = btn.style === "destructive";
              const isPrimary = !isCancel && !isDestructive && (btn.style === "default" || i === btns.length - 1);
              const bg = isDestructive ? colors.danger : isPrimary ? colors.primary : colors.muted;
              const txt = isDestructive ? "#fff" : isPrimary ? colors.primaryOn : colors.fg;
              return <Pressable key={i} onPress={() => handleBtn(btn)} style={({
                pressed
              }) => [styles.btn, {
                backgroundColor: bg
              }, pressed && {
                opacity: 0.85
              }]}>
                    <Text style={[styles.btnTxt, {
                  color: txt
                }]}>{btn.text}</Text>
                  </Pressable>;
            })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AlertContext.Provider>;
}
export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within an AlertProvider");
  return ctx;
}
const makeStyles = colors => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: "center"
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  title: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 19,
    textAlign: "center"
  },
  message: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    alignSelf: "stretch"
  },
  stack: {
    flexDirection: "column"
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  btnTxt: {
    fontFamily: fonts.semibold,
    fontSize: 15
  }
});
