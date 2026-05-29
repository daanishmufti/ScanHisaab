import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { radius } from "../theme";
import { useTheme } from "../context/ThemeContext";
export default function Skeleton({
  width = "100%",
  height = 16,
  style
}) {
  const {
    colors
  } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(opacity, {
      toValue: 0.9,
      duration: 700,
      useNativeDriver: true
    }), Animated.timing(opacity, {
      toValue: 0.4,
      duration: 700,
      useNativeDriver: true
    })]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{
    width,
    height,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    opacity
  }, style]} />;
}