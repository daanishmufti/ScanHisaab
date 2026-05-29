import { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Images } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { fonts, radius } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
export default function BatchScanCamera({
  visible,
  onClose,
  onCapture
}) {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  useSyncNavBar(visible);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) setCount(0);
  }, [visible]);
  const capture = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 1,
        shutterSound: false
      });
      if (photo?.uri) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onCapture({
          uri: photo.uri
        });
        setCount(c => c + 1);
      }
    } catch {} finally {
      setBusy(false);
    }
  };
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {!permission ? <View style={styles.center}><ActivityIndicator color="#fff" /></View> : !permission.granted ? <View style={styles.center}>
            <Camera size={44} color="#fff" />
            <Text style={styles.permTxt}>Camera access is needed for batch scanning.</Text>
            <Pressable onPress={requestPermission} style={styles.permBtn}>
              <Text style={styles.permBtnTxt}>Grant access</Text>
            </Pressable>
            <Pressable onPress={onClose} style={{
          marginTop: 16
        }}>
              <Text style={{
            color: "#fff",
            fontFamily: fonts.medium
          }}>Cancel</Text>
            </Pressable>
          </View> : <>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

            <View style={[styles.topBar, {
          paddingTop: insets.top + 10
        }]}>
              <View style={styles.counter}>
                <Images size={14} color="#fff" />
                <Text style={styles.counterTxt}>{count} captured</Text>
              </View>
              <Pressable onPress={onClose} style={styles.doneBtn}>
                <Text style={styles.doneTxt}>Done</Text>
              </Pressable>
            </View>

            <View style={styles.frame} pointerEvents="none" />

            <View style={[styles.bottom, {
          paddingBottom: insets.bottom + 24
        }]}>
              <Text style={styles.hint}>Tap to capture — instantly, no confirmation. Keep going, then tap Done to review &amp; Extract.</Text>
              <Pressable onPress={capture} disabled={busy} style={({
            pressed
          }) => [styles.shutter, pressed && {
            opacity: 0.7
          }]}>
                <View style={styles.shutterInner}>{busy ? <ActivityIndicator color={colors.bg} /> : null}</View>
              </Pressable>
            </View>
          </>}
      </View>
    </Modal>;
}
const makeStyles = colors => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 10
  },
  permTxt: {
    color: "#fff",
    fontFamily: fonts.regular,
    textAlign: "center"
  },
  permBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md
  },
  permBtnTxt: {
    color: colors.primaryOn,
    fontFamily: fonts.semibold
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill
  },
  counterTxt: {
    color: "#fff",
    fontFamily: fonts.semibold,
    fontSize: 13
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.pill
  },
  doneTxt: {
    color: colors.primaryOn,
    fontFamily: fonts.bold,
    fontSize: 15
  },
  frame: {
    position: "absolute",
    top: "18%",
    bottom: "22%",
    left: 24,
    right: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    borderStyle: "dashed",
    borderRadius: radius.lg
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 18
  },
  hint: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  }
});