import { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { radius, fonts, shadow } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
import { currentMonth } from "../lib/format";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export default function MonthPicker({
  value,
  onChange
}) {
  const {
    colors
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  useSyncNavBar(open);
  const selYear = Number(value.slice(0, 4));
  const selMonth = Number(value.slice(5, 7));
  const [viewYear, setViewYear] = useState(selYear);
  const now = currentMonth();
  const curYear = Number(now.slice(0, 4));
  const curMonth = Number(now.slice(5, 7));
  const nextYearDisabled = viewYear >= curYear;
  const openPicker = () => {
    setViewYear(selYear);
    setOpen(true);
  };
  const pick = m => {
    onChange(`${viewYear}-${String(m).padStart(2, "0")}`);
    setOpen(false);
  };
  const isFuture = m => viewYear > curYear || viewYear === curYear && m > curMonth;
  return <>
      <Pressable onPress={openPicker} style={({
      pressed
    }) => [styles.trigger, pressed && {
      opacity: 0.7
    }]}>
        <Calendar size={18} color={colors.primary} />
        <Text style={styles.triggerTxt} numberOfLines={1}>{MONTHS[selMonth - 1]} {selYear}</Text>
        <ChevronDown size={16} color={colors.fgMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, shadow(2)]} onPress={() => {}}>
            <Text style={styles.heading}>Select month</Text>

            <View style={styles.yearNav}>
              <Pressable onPress={() => setViewYear(y => y - 1)} style={({
              pressed
            }) => [styles.yBtn, pressed && {
              opacity: 0.6
            }]} hitSlop={8}>
                <ChevronLeft size={22} color={colors.fg} />
              </Pressable>
              <Text style={styles.yearTxt}>{viewYear}</Text>
              <Pressable onPress={() => !nextYearDisabled && setViewYear(y => y + 1)} disabled={nextYearDisabled} style={({
              pressed
            }) => [styles.yBtn, nextYearDisabled && {
              opacity: 0.3
            }, pressed && !nextYearDisabled && {
              opacity: 0.6
            }]} hitSlop={8}>
                <ChevronRight size={22} color={colors.fg} />
              </Pressable>
            </View>

            <View style={styles.grid}>
              {MONTHS.map((label, i) => {
              const m = i + 1;
              const future = isFuture(m);
              const selected = viewYear === selYear && m === selMonth;
              return <Pressable key={m} disabled={future} onPress={() => pick(m)} style={({
                pressed
              }) => [styles.cell, selected && styles.cellSel, future && {
                opacity: 0.25
              }, pressed && !future && !selected && {
                backgroundColor: colors.muted
              }]}>
                    <Text style={[styles.cellTxt, selected && styles.cellTxtSel]}>{label}</Text>
                  </Pressable>;
            })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>;
}
const makeStyles = colors => StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  triggerTxt: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 16,
    flex: 1
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20
  },
  heading: {
    color: colors.fgMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center"
  },
  yearNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14
  },
  yBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  yearTxt: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 22
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },
  cell: {
    width: "31%",
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  cellSel: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  cellTxt: {
    color: colors.fg,
    fontFamily: fonts.medium,
    fontSize: 15
  },
  cellTxtSel: {
    color: colors.primaryOn,
    fontFamily: fonts.bold
  }
});