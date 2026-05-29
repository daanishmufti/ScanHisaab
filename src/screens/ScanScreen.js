import { useState } from "react";
import { View, Text, ScrollView, Image, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { isDocScannerSupported, scanDocuments } from "../lib/documentScanner";
import { ReceiptText, Camera, Layers, Images, Check, CircleAlert, X, Sparkles, SquarePen, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { radius, fonts, shadow } from "../theme";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import Button from "../components/Button";
import { processReceipt, deleteReceipt, updateReceipt, createReceipt } from "../lib/api";
import { formatCurrency } from "../lib/format";
import BatchScanCamera from "../components/BatchScanCamera";
import ReceiptEditModal from "../components/ReceiptEditModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAppAlert } from "../components/AlertProvider";
const needsHint = p => {
  const m = p && p.missing || [];
  const noSeller = m.includes("seller");
  const noAmount = m.includes("total") || m.includes("amount");
  if (noSeller && noAmount) return "We couldn't read the seller or amount — please enter them.";
  if (noSeller) return "We couldn't read the seller — please add it (amount was detected).";
  if (noAmount) return "We couldn't confirm the amount — please check it.";
  return "Please confirm the details.";
};
export default function ScanScreen() {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { alert } = useAppAlert();
  const [shots, setShots] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [summary, setSummary] = useState(null);
  const update = (id, patch) => setShots(s => s.map(x => x.id === id ? {
    ...x,
    ...patch
  } : x));
  const removeShot = id => setShots(s => s.filter(x => x.id !== id));
  const addAssets = assets => {
    setSummary(null);
    setShots(s => [...s, ...assets.map(a => ({
      id: `${Date.now()}-${Math.random()}`,
      uri: a.uri,
      status: "pending"
    }))]);
  };
  const runScanner = async ({
    max,
    fallback
  }) => {
    if (!isDocScannerSupported()) return fallback();
    try {
      const uris = await scanDocuments(max ? {
        max
      } : {});
      if (uris.length) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        addAssets(uris.map(uri => ({
          uri
        })));
      }
    } catch (e) {
      alert("Couldn't open the scanner", e.message, null, { tone: "error" });
    }
  };
  const takePhoto = () => runScanner({
    max: 1,
    fallback: async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return alert("Camera permission needed", "Enable camera access for ScanHisaab in your device Settings.", null, { tone: "info" });
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 1
      });
      if (!result.canceled && result.assets?.length) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        addAssets(result.assets);
      }
    }
  });
  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return alert("Photos permission needed", "Enable photo access for ScanHisaab in your device Settings.", null, { tone: "info" });
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      allowsMultipleSelection: true
    });
    if (!result.canceled && result.assets?.length) addAssets(result.assets);
  };
  const toProcess = shots.filter(s => s.status !== "done");
  const done = shots.filter(s => s.status === "done");
  const processAll = async () => {
    setProcessing(true);
    setSummary(null);
    let ok = 0,
      failed = 0,
      needs = 0,
      firstNeedsInput = null;
    for (const shot of shots) {
      if (shot.status === "done") continue;
      update(shot.id, {
        status: "processing",
        error: null
      });
      try {
        const data = await processReceipt({
          uri: shot.uri
        });
        if (data?.needsInput) {
          update(shot.id, {
            status: "needs-input",
            result: data
          });
          if (!firstNeedsInput) firstNeedsInput = {
            ...shot,
            status: "needs-input",
            result: data
          };
          needs++;
        } else {
          update(shot.id, {
            status: "done",
            result: data
          });
          ok++;
        }
      } catch (e) {
        update(shot.id, {
          status: "error",
          error: e.message || "Scan failed. Please try again."
        });
        failed++;
      }
    }
    setProcessing(false);
    setSummary({
      ok,
      failed,
      needs
    });
    Haptics.notificationAsync(failed && !ok ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (firstNeedsInput) setEditing(firstNeedsInput);
  };
  const doRemove = async () => {
    const shot = pendingRemove;
    setPendingRemove(null);
    if (!shot) return;
    try {
      if (shot.result?.receipt?.id) await deleteReceipt(shot.result.receipt.id);
      removeShot(shot.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    }
  };
  const saveEdit = async fields => {
    const shot = editing;
    if (!shot) return;
    setSavingEdit(true);
    try {
      const id = shot.result?.receipt?.id;
      const row = id ? await updateReceipt(id, fields) : await createReceipt(fields);
      const newParsed = {
        ...(shot.result?.parsed || {}),
        merchantName: fields.merchant,
        date: fields.date,
        totalAmount: fields.total,
        currency: fields.currency,
        summary: fields.summary,
        items: fields.items
      };
      update(shot.id, {
        status: "done",
        result: {
          receipt: row,
          parsed: newParsed
        }
      });
      setEditing(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    } finally {
      setSavingEdit(false);
    }
  };
  return <>
    <ScrollView style={{
      flex: 1,
      backgroundColor: "transparent"
    }} contentContainerStyle={{
      padding: 16,
      paddingBottom: 30
    }}>
      {}
      <View style={[styles.captureCard, shadow(1)]}>
        <View style={styles.iconCircle}>
          <ReceiptText size={28} color={colors.primary} />
        </View>
        <Text style={styles.captureTitle}>Scan a receipt</Text>
        <Text style={styles.captureSub}>Scan one (auto-crops &amp; flattens), batch-scan several, or pick from your gallery.</Text>
        <Button title="Scan receipt" onPress={takePhoto} icon={<Camera size={18} color={colors.primaryOn} />} style={{
          alignSelf: "stretch",
          marginTop: 8
        }} />
        <View style={styles.actionRow}>
          <Button title="Batch scan" variant="ghost" onPress={() => setBatchOpen(true)} icon={<Layers size={18} color={colors.fg} />} style={{
            flex: 1
          }} />
          <Button title="Gallery" variant="ghost" onPress={pickFromGallery} icon={<Images size={18} color={colors.fg} />} style={{
            flex: 1
          }} />
        </View>
      </View>

      {shots.length > 0 && <>
          <Text style={styles.section}>Captured ({shots.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{
          marginVertical: 10
        }}>
            {shots.map(s => <View key={s.id} style={styles.thumb}>
                <Image source={{
              uri: s.uri
            }} style={{
              width: "100%",
              height: "100%"
            }} />
                {s.status === "processing" && <View style={styles.thumbOverlay}><ActivityIndicator color="#fff" /></View>}
                {s.status === "done" && <View style={[styles.thumbOverlay, {
              backgroundColor: "rgba(34,197,94,0.55)"
            }]}>
                    <Check size={22} color="#fff" />
                  </View>}
                {s.status === "error" && <View style={[styles.thumbOverlay, {
              backgroundColor: "rgba(239,68,68,0.55)"
            }]}>
                    <CircleAlert size={20} color="#fff" />
                  </View>}
                {s.status === "needs-input" && <Pressable onPress={() => setEditing(s)} style={[styles.thumbOverlay, {
              backgroundColor: "rgba(245,158,11,0.6)"
            }]}>
                    <SquarePen size={20} color="#fff" />
                  </Pressable>}
                {(s.status === "pending" || s.status === "error") && !processing && <Pressable onPress={() => removeShot(s.id)} style={styles.remove} hitSlop={6}>
                    <X size={14} color="#fff" />
                  </Pressable>}
              </View>)}
          </ScrollView>
          <Button title={processing ? "Processing…" : `Extract ${toProcess.length || ""} receipt${toProcess.length === 1 ? "" : "s"}`.trim()} onPress={processAll} loading={processing} disabled={toProcess.length === 0} icon={!processing ? <Sparkles size={16} color={colors.primaryOn} /> : null} />

          {summary && <View style={[styles.summaryCard, shadow(1)]}>
              <View style={styles.summaryItem}>
                <Check size={16} color={colors.success} />
                <Text style={styles.summaryTxt}>{summary.ok} saved</Text>
              </View>
              {summary.needs > 0 && <View style={styles.summaryItem}>
                  <SquarePen size={16} color="#f59e0b" />
                  <Text style={[styles.summaryTxt, {
              color: "#f59e0b"
            }]}>{summary.needs} need details</Text>
                </View>}
              {summary.failed > 0 && <View style={styles.summaryItem}>
                  <CircleAlert size={16} color={colors.danger} />
                  <Text style={[styles.summaryTxt, {
              color: colors.danger
            }]}>{summary.failed} failed</Text>
                </View>}
            </View>}

          {shots.filter(s => s.status === "needs-input").map(s => <Pressable key={s.id} onPress={() => setEditing(s)} style={({
          pressed
        }) => [styles.needsCard, pressed && {
          opacity: 0.85
        }]}>
              <SquarePen size={20} color="#f59e0b" />
              <View style={{
            flex: 1
          }}>
                <Text style={styles.needsTitle}>Tap to enter the details</Text>
                <Text style={styles.needsMsg}>{needsHint(s.result?.parsed)}</Text>
              </View>
              <Pressable onPress={() => removeShot(s.id)} hitSlop={8} style={({
            pressed
          }) => pressed && {
            opacity: 0.6
          }}>
                <X size={18} color={colors.fgMuted} />
              </Pressable>
            </Pressable>)}

          {shots.filter(s => s.status === "error").map(s => <View key={s.id} style={styles.errorCard}>
              <CircleAlert size={20} color={colors.danger} />
              <View style={{
            flex: 1
          }}>
                <Text style={styles.errorTitle}>Couldn't scan this receipt</Text>
                <Text style={styles.errorMsg}>{s.error}</Text>
              </View>
              <Pressable onPress={() => removeShot(s.id)} hitSlop={8} style={({
            pressed
          }) => pressed && {
            opacity: 0.6
          }}>
                <X size={18} color={colors.fgMuted} />
              </Pressable>
            </View>)}
        </>}

      {done.map(s => {
        const p = s.result.parsed;
        return <View key={s.id} style={[styles.card, shadow(1)]}>
            <View style={styles.cardHead}>
              <Text style={styles.merchant}>{p.merchantName}</Text>
              <Text style={styles.muted}>{p.date}</Text>
            </View>
            {p.summary ? <Text style={[styles.muted, {
            marginTop: 8
          }]}>{p.summary}</Text> : null}

            <View style={styles.totals}>
              <View style={styles.lineRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>{formatCurrency(p.totalAmount, p.currency)}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <Pressable onPress={() => setEditing(s)} style={({
              pressed
            }) => [styles.actionBtn, pressed && {
              opacity: 0.6
            }]}>
                <SquarePen size={16} color={colors.fg} />
                <Text style={styles.actionTxt}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => setPendingRemove(s)} style={({
              pressed
            }) => [styles.actionBtn, pressed && {
              opacity: 0.6
            }]}>
                <Trash2 size={16} color={colors.danger} />
                <Text style={[styles.actionTxt, {
                color: colors.danger
              }]}>Remove</Text>
              </Pressable>
            </View>
          </View>;
      })}
      <View style={{
        height: 20
      }} />
    </ScrollView>
    <BatchScanCamera visible={batchOpen} onClose={() => setBatchOpen(false)} onCapture={asset => addAssets([asset])} />
    <ReceiptEditModal visible={!!editing} parsed={editing?.result?.parsed} saving={savingEdit} title={editing?.status === "needs-input" ? "Enter receipt details" : "Edit receipt"} hint={editing?.status === "needs-input" ? needsHint(editing?.result?.parsed) : undefined} onClose={() => setEditing(null)} onSave={saveEdit} />
    <ConfirmDialog visible={!!pendingRemove} destructive icon={Trash2} title="Remove receipt?" message={pendingRemove ? `This permanently deletes the scanned receipt from ${pendingRemove.result?.parsed?.merchantName || "this scan"}.` : ""} confirmLabel="Remove" onConfirm={doRemove} onCancel={() => setPendingRemove(null)} />
    </>;
}
const makeStyles = colors => StyleSheet.create({
  muted: {
    color: colors.fgMuted,
    fontFamily: fonts.regular
  },
  captureCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: "center"
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  captureTitle: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 20
  },
  captureSub: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    alignSelf: "stretch"
  },
  section: {
    color: colors.fgMuted,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10
  },
  remove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center"
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 14
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  merchant: {
    color: colors.fg,
    fontSize: 17,
    fontFamily: fonts.bold,
    flex: 1
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  badgeTxt: {
    color: colors.fg,
    fontSize: 12,
    fontFamily: fonts.semibold
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    gap: 12
  },
  lineName: {
    color: colors.fg,
    flex: 1,
    fontFamily: fonts.regular
  },
  lineVal: {
    color: colors.fg,
    fontVariant: ["tabular-nums"],
    fontFamily: fonts.regular
  },
  totals: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 10,
    paddingTop: 10
  },
  totalLabel: {
    color: colors.fg,
    fontFamily: fonts.bold
  },
  totalVal: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontVariant: ["tabular-nums"]
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  actionTxt: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  summaryCard: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  summaryTxt: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.10)"
  },
  errorTitle: {
    color: colors.danger,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  errorMsg: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18
  },
  needsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.45)",
    backgroundColor: "rgba(245,158,11,0.10)"
  },
  needsTitle: {
    color: "#f59e0b",
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  needsMsg: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18
  }
});