import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { radius, fonts } from "../theme";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
export default function TextField({
  label,
  secureTextEntry = false,
  ...props
}) {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);
  return <View style={{
    marginBottom: 16
  }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.wrap, focused && styles.wrapFocused]}>
        <TextInput placeholderTextColor={colors.fgMuted} style={styles.input} secureTextEntry={secureTextEntry && hidden} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props} />
        {secureTextEntry && <Pressable onPress={() => setHidden(h => !h)} hitSlop={10} style={styles.eye} accessibilityRole="button" accessibilityLabel={hidden ? "Show password" : "Hide password"}>
            {hidden ? <EyeOff size={18} color={colors.fgMuted} /> : <Eye size={18} color={colors.fgMuted} />}
          </Pressable>}
      </View>
    </View>;
}
const makeStyles = colors => StyleSheet.create({
  label: {
    color: colors.fg,
    fontSize: 14,
    fontFamily: fonts.medium,
    marginBottom: 6
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: 14
  },
  wrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface
  },
  input: {
    flex: 1,
    color: colors.fg,
    fontSize: 16,
    fontFamily: fonts.regular,
    paddingVertical: 12
  },
  eye: {
    paddingLeft: 10,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  }
});