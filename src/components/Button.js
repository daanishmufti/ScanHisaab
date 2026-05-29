import { useRef } from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet, Animated, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { radius, fonts, shadow } from "../theme";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon = null,
  style,
  haptic = true
}) {
  const {
    colors,
    gradients
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";
  const pressIn = () => Animated.spring(scale, {
    toValue: 0.97,
    useNativeDriver: true,
    speed: 50,
    bounciness: 0
  }).start();
  const pressOut = () => Animated.spring(scale, {
    toValue: 1,
    useNativeDriver: true,
    speed: 50,
    bounciness: 0
  }).start();
  const handlePress = e => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };
  const content = loading ? <ActivityIndicator color={isPrimary ? colors.primaryOn : colors.fg} /> : <>
      {icon}
      <Text style={[styles.txt, isPrimary && {
      color: colors.primaryOn
    }]}>{title}</Text>
    </>;
  return <Animated.View style={[{
    transform: [{
      scale
    }]
  }, isPrimary && shadow(1), style]}>
      <Pressable onPress={handlePress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled || loading} style={{
      borderRadius: radius.md,
      overflow: "hidden"
    }}>
        {isPrimary ? <LinearGradient colors={gradients.primary} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 1
      }} style={[styles.btn, (disabled || loading) && {
        opacity: 0.5
      }]}>
            {content}
          </LinearGradient> : <View style={[styles.btn, isGhost ? styles.ghost : styles.secondary, (disabled || loading) && {
        opacity: 0.5
      }]}>
            {content}
          </View>}
      </Pressable>
    </Animated.View>;
}
const makeStyles = colors => StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18
  },
  secondary: {
    backgroundColor: colors.muted
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border
  },
  txt: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 16
  }
});