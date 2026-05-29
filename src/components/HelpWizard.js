import { useState, useRef } from "react";
import { Modal, View, Text, Pressable, ScrollView, Image, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, ChevronRight, Check } from "lucide-react-native";
import { fonts, radius } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";

// The 8 wizard steps. Each image is a phone screenshot with a baked-in purple
// callout ring + numbered badge (produced by scripts/build_help_images.py).
const STEPS = [
  { image: require("../../assets/help/step-1.png"),
    title: "Your dashboard",
    body: "Total spent, receipts and budget — everything at a glance. Tap Yearly / Monthly to switch the view." },
  { image: require("../../assets/help/step-2.png"),
    title: "Auto-capture scanning",
    body: "Open the Scan tab and hold the camera steady. With Auto capture on, ScanHisaab snaps the receipt the moment it's in focus." },
  { image: require("../../assets/help/step-3.png"),
    title: "Review the crop",
    body: "Adjust the crop, enhance or rotate if you want, then tap Next to keep the shot." },
  { image: require("../../assets/help/step-4.png"),
    title: "Extract & save",
    body: "Tap Extract receipts to read the seller, total and date — fully on-device. Each one saves automatically." },
  { image: require("../../assets/help/step-5.png"),
    title: "Edit any time",
    body: "Tap any receipt on the dashboard to expand it. Use Edit to fix details, or Delete to remove it." },
  { image: require("../../assets/help/step-6.png"),
    title: "Add manually",
    body: "Some receipts can't be scanned. Tap the Add tab to enter merchant, date and total by hand, then Save receipt." },
  { image: require("../../assets/help/step-7.png"),
    title: "Budget alerts",
    body: "Set a yearly or monthly budget on the dashboard. You'll get a heads-up here when you're approaching or over it." },
  { image: require("../../assets/help/step-8.png"),
    title: "Settings menu",
    body: "Open the burger menu anytime for Dark mode, notifications, default currency, help, and clearing data." },
];

export default function HelpWizard({ visible, onClose }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useSyncNavBar(visible);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);

  const goto = (i) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };
  const onScroll = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };
  const close = () => { setIndex(0); scrollRef.current?.scrollTo({ x: 0, animated: false }); onClose?.(); };
  const isLast = index === STEPS.length - 1;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerKicker}>How it works</Text>
            <Text style={styles.headerSub}>{index + 1} of {STEPS.length}</Text>
          </View>
          <Pressable onPress={close} hitSlop={8} accessibilityLabel="Close" style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
            <X size={20} color={colors.fg} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={{ flex: 1 }}
        >
          {STEPS.map((s, i) => (
            <View key={i} style={[styles.page, { width }]}>
              <View style={styles.phone}>
                <Image source={s.image} style={styles.shot} resizeMode="contain" />
              </View>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 18 + insets.bottom }]}>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.nav}>
            <Pressable onPress={close} hitSlop={8} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.skipTxt}>{isLast ? "Close" : "Skip"}</Text>
            </Pressable>
            <Pressable
              onPress={isLast ? close : () => goto(index + 1)}
              style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.nextTxt}>{isLast ? "Done" : "Next"}</Text>
              {isLast ? <Check size={18} color={colors.primaryOn} /> : <ChevronRight size={18} color={colors.primaryOn} />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 },
  headerKicker: { color: colors.fg, fontFamily: fonts.bold, fontSize: 18 },
  headerSub: { color: colors.fgMuted, fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  page: { alignItems: "center", paddingHorizontal: 22, paddingTop: 6, paddingBottom: 14, gap: 12 },
  phone: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderRadius: radius.xl, padding: 10, borderWidth: 1, borderColor: colors.border },
  shot: { width: "100%", height: "100%", borderRadius: radius.lg },
  title: { color: colors.fg, fontFamily: fonts.bold, fontSize: 22, textAlign: "center", marginTop: 4 },
  body: { color: colors.fgMuted, fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21, textAlign: "center", paddingHorizontal: 6 },
  footer: { padding: 18, gap: 16 },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  skipTxt: { color: colors.fgMuted, fontFamily: fonts.semibold, fontSize: 15 },
  nextBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.primary },
  nextTxt: { color: colors.primaryOn, fontFamily: fonts.bold, fontSize: 15 },
});
