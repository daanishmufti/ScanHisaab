import { useEffect, useRef } from "react";
import { Animated, Text, View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Bell, TriangleAlert, Wallet } from "lucide-react-native";
import { fonts, radius, shadow } from "../theme";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
const ICON = {
  budget_exceeded: TriangleAlert,
  budget_warning: Wallet
};
const VISIBLE_MS = 3500;
export default function NotificationBanner() {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    toast,
    clearToast
  } = useNotifications();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;
  const player = useAudioPlayer(require("../../assets/notify.wav"));
  const hideTimer = useRef(null);
  const hide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.timing(translateY, {
      toValue: -160,
      duration: 240,
      useNativeDriver: true
    }).start(() => clearToast());
  };
  useEffect(() => {
    if (!toast) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {}
    ;
    Haptics.notificationAsync(toast.type === "budget_exceeded" ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8
    }).start();
    hideTimer.current = setTimeout(hide, VISIBLE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);
  if (!toast) return null;
  const Icon = ICON[toast.type] || Bell;
  const tint = toast.type === "budget_exceeded" ? colors.danger : colors.primary;
  return <Animated.View pointerEvents="box-none" style={[styles.wrap, {
    top: insets.top + 8,
    transform: [{
      translateY
    }]
  }]}>
      <Pressable onPress={hide} style={[styles.card, shadow(2)]} accessibilityRole="alert">
        <View style={[styles.icon, {
        backgroundColor: `${tint}22`
      }]}>
          <Icon size={20} color={tint} />
        </View>
        <View style={{
        flex: 1
      }}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          {toast.body ? <Text style={styles.body} numberOfLines={2}>{toast.body}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>;
}
const makeStyles = colors => StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 1000
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  body: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18
  }
});