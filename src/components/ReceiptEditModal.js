import { useEffect, useState } from "react";
import { Modal, View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { X } from "lucide-react-native";
import { fonts, radius, shadow } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
import TextField from "./TextField";
import Button from "./Button";
export default function ReceiptEditModal({
  visible,
  parsed,
  saving = false,
  onClose,
  onSave,
  title = "Edit receipt",
  hint
}) {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  useSyncNavBar(visible);
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [total, setTotal] = useState("");
  const [currency, setCurrency] = useState("");
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!parsed) return;
    setMerchant(parsed.merchantName || "");
    setDate(parsed.date || "");
    setTotal(parsed.totalAmount != null ? String(parsed.totalAmount) : "");
    setCurrency(parsed.currency || "PKR");
    setSummary(parsed.summary || "");
    setItems(Array.isArray(parsed.items) ? parsed.items : []);
  }, [parsed]);
  const removeItem = idx => setItems(arr => arr.filter((_, i) => i !== idx));
  const submit = () => {
    onSave?.({
      merchant: merchant.trim() || "Unknown",
      date: date.trim(),
      total: parseFloat(total) || 0,
      currency: (currency.trim() || "PKR").toUpperCase().slice(0, 3),
      summary: summary.trim() || null,
      items
    });
  };
  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{
      flex: 1
    }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, shadow(2)]} onPress={() => {}}>
            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
                <X size={22} color={colors.fgMuted} />
              </Pressable>
            </View>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}

            <ScrollView style={{
            maxHeight: 440
          }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextField label="Merchant" value={merchant} onChangeText={setMerchant} placeholder="Store name" />
              <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
              <View style={styles.row}>
                <View style={{
                flex: 1
              }}>
                  <TextField label="Total" value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0.00" />
                </View>
                <View style={{
                flex: 1
              }}>
                  <TextField label="Currency" value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} placeholder="PKR" />
                </View>
              </View>
              <TextField label="Note" value={summary} onChangeText={setSummary} placeholder="Optional" />

              {items.length > 0 && <>
                  <Text style={styles.itemsLabel}>Items — tap × to remove</Text>
                  {items.map((it, i) => <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {it.quantity > 1 ? `${it.quantity}× ` : ""}{it.name}
                      </Text>
                      <Pressable onPress={() => removeItem(i)} hitSlop={8} style={({
                  pressed
                }) => [styles.itemRemove, pressed && {
                  opacity: 0.6
                }]}>
                        <X size={16} color={colors.danger} />
                      </Pressable>
                    </View>)}
                </>}
            </ScrollView>

            <Button title={saving ? "Saving…" : "Save changes"} onPress={submit} loading={saving} style={{
            marginTop: 14
          }} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>;
}
const makeStyles = colors => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    paddingBottom: 28
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  title: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 18
  },
  hint: {
    color: colors.fgMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    gap: 12
  },
  itemsLabel: {
    color: colors.fgMuted,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  itemName: {
    color: colors.fg,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14
  },
  itemRemove: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.12)"
  }
});