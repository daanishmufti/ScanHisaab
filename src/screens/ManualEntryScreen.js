import { useState, useEffect } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SquarePen, Save } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { fonts, radius, shadow } from "../theme";
import { useTheme, useThemedStyles } from "../context/ThemeContext";
import TextField from "../components/TextField";
import Button from "../components/Button";
import { useAppAlert } from "../components/AlertProvider";
import { createReceipt, getDefaultCurrency } from "../lib/api";
const todayStr = () => new Date().toISOString().slice(0, 10);
export default function ManualEntryScreen({
  navigation
}) {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { alert } = useAppAlert();
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(todayStr());
  const [total, setTotal] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getDefaultCurrency().then(setCurrency).catch(() => {});
  }, []);
  const reset = () => {
    setMerchant("");
    setDate(todayStr());
    setTotal("");
    setNote("");
  };
  const save = async () => {
    if (!merchant.trim()) return alert("Missing merchant", "Enter the merchant / store name.", null, { tone: "error" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert("Invalid date", "Use the format YYYY-MM-DD.", null, { tone: "error" });
    const totalN = parseFloat(total);
    if (!Number.isFinite(totalN) || totalN < 0) return alert("Invalid total", "Enter a valid total amount.", null, { tone: "error" });
    setSaving(true);
    try {
      await createReceipt({
        merchant: merchant.trim().slice(0, 255),
        date,
        total: Math.round(totalN * 100) / 100,
        currency: (currency.trim() || "PKR").toUpperCase().slice(0, 3),
        summary: note.trim() || null
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      reset();
      alert("Saved", "Receipt added.", [{
        text: "Add another",
        style: "cancel"
      }, {
        text: "View dashboard",
        onPress: () => navigation.navigate("Dashboard")
      }], { tone: "success" });
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    } finally {
      setSaving(false);
    }
  };
  return <KeyboardAvoidingView style={{
    flex: 1,
    backgroundColor: "transparent"
  }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{
      padding: 16,
      paddingBottom: 40
    }} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, shadow(1)]}>
          <View style={styles.iconCircle}>
            <SquarePen size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>Add a receipt manually</Text>
          <Text style={styles.sub}>For receipts you can't scan — enter the details yourself.</Text>

          <TextField label="Merchant *" value={merchant} onChangeText={setMerchant} placeholder="e.g. Tesco" />
          <TextField label="Date *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" />

          <View style={styles.row}>
            <View style={{
            flex: 1
          }}>
              <TextField label="Total *" value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
            <View style={{
            flex: 1
          }}>
              <TextField label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" placeholder="PKR" maxLength={3} />
            </View>
          </View>

          <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Anything to remember" />

          <Button title={saving ? "Saving…" : "Save receipt"} onPress={save} loading={saving} icon={!saving ? <Save size={18} color={colors.primaryOn} /> : null} style={{
          marginTop: 6
        }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>;
}
const makeStyles = colors => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  title: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 18
  },
  sub: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    marginTop: 4,
    marginBottom: 16
  },
  row: {
    flexDirection: "row",
    gap: 12
  }
});