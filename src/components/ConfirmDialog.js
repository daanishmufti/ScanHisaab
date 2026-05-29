import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { TriangleAlert, Info } from "lucide-react-native";
import { fonts, radius, shadow } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
export default function ConfirmDialog({
  visible,
  icon,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel
}) {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  useSyncNavBar(visible);
  const accent = destructive ? colors.danger : colors.primary;
  const Icon = icon || (destructive ? TriangleAlert : Info);
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.card, shadow(2)]} onPress={() => {}}>
          <View style={[styles.iconCircle, {
          backgroundColor: `${accent}22`
        }]}>
            <Icon size={26} color={accent} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.row}>
            <Pressable onPress={onCancel} style={({
            pressed
          }) => [styles.btn, styles.cancel, pressed && {
            opacity: 0.7
          }]}>
              <Text style={styles.cancelTxt}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={({
            pressed
          }) => [styles.btn, {
            backgroundColor: accent
          }, pressed && {
            opacity: 0.85
          }]}>
              <Text style={[styles.confirmTxt, {
              color: destructive ? "#fff" : colors.primaryOn
            }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>;
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
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  cancel: {
    backgroundColor: colors.muted
  },
  cancelTxt: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 15
  },
  confirmTxt: {
    fontFamily: fonts.semibold,
    fontSize: 15
  }
});