import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, TextInput, RefreshControl, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronUp, ChevronDown, Trash2, Check, X, Search, CircleX, ArrowUpDown, ReceiptText, ChevronLeft, ChevronRight, ListChecks, SquarePen } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { radius, fonts, shadow } from "../theme";
import { useTheme, useThemedStyles, useSyncNavBar } from "../context/ThemeContext";
import { getReceipts, getBudget, saveBudget, deleteReceipt, deleteReceipts, updateReceipt, getMostRecentReceiptMonth, onDataChange } from "../lib/api";
import { currentMonth, monthLabel, formatCurrency, formatDate } from "../lib/format";
import Skeleton from "../components/Skeleton";
import MonthPicker from "../components/MonthPicker";
import ConfirmDialog from "../components/ConfirmDialog";
import ReceiptEditModal from "../components/ReceiptEditModal";
import { useAppAlert } from "../components/AlertProvider";
import { useNotifications } from "../context/NotificationsContext";
const SORT_OPTIONS = [{
  key: "date_desc",
  label: "Newest first"
}, {
  key: "date_asc",
  label: "Oldest first"
}, {
  key: "amount_desc",
  label: "Highest amount"
}, {
  key: "amount_asc",
  label: "Lowest amount"
}, {
  key: "merchant_asc",
  label: "Merchant A–Z"
}];
export default function DashboardScreen() {
  const {
    colors,
    gradients
  } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    notifyOnce,
    clearAlertFor,
    alertsReady
  } = useNotifications();
  const { alert } = useAppAlert();
  const [mode, setMode] = useState("year");
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loadedPeriod, setLoadedPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoAdjusted, setAutoAdjusted] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [sortOpen, setSortOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  useSyncNavBar(sortOpen || !!editing);
  const curYear = String(new Date().getFullYear());
  const period = mode === "year" ? year : month;
  const periodLabel = mode === "year" ? year : monthLabel(month);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([getReceipts(period), getBudget(period)]);
      setRows(r);
      setBudget(b);
      setLoadedPeriod(period);
      if (mode === "month" && r.length === 0 && month === currentMonth() && !autoAdjusted) {
        setAutoAdjusted(true);
        const m = await getMostRecentReceiptMonth();
        if (m && m !== month) {
          setMonth(m);
          return;
        }
      }
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [period, mode, month, autoAdjusted]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  useEffect(() => onDataChange(() => load()), [load]);
  const {
    total,
    count,
    avg,
    displayCurrency,
    mixed
  } = useMemo(() => {
    let total = 0;
    const curCount = {};
    for (const r of rows) {
      total += Number(r.total_amount) || 0;
      const cur = r.currency || "PKR";
      curCount[cur] = (curCount[cur] || 0) + 1;
    }
    const count = rows.length;
    const displayCurrency = Object.entries(curCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "PKR";
    return {
      total,
      count,
      avg: count ? total / count : 0,
      displayCurrency,
      mixed: Object.keys(curCount).length > 1
    };
  }, [rows]);
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(r => {
      if (q) {
        const hay = `${r.merchant_name} ${r.summary || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return a.transaction_date.localeCompare(b.transaction_date);
        case "amount_desc":
          return Number(b.total_amount) - Number(a.total_amount);
        case "amount_asc":
          return Number(a.total_amount) - Number(b.total_amount);
        case "merchant_asc":
          return a.merchant_name.localeCompare(b.merchant_name);
        default:
          return b.transaction_date.localeCompare(a.transaction_date);
      }
    });
  }, [rows, query, sortBy]);
  const limit = Number(budget?.monthly_limit) || 0;
  const pct = limit > 0 ? Math.min(total / limit * 100, 100) : 0;
  const over = limit > 0 && total > limit;
  const budgetColor = limit <= 0 ? colors.fgMuted : over ? colors.danger : pct > 80 ? colors.primary : colors.success;
  useEffect(() => {
    if (loading || limit <= 0 || loadedPeriod !== period || !alertsReady) return;
    const label = periodLabel;
    const scope = mode === "year" ? "yearly " : "";
    const exceededKey = `budget-exceeded-${period}`;
    const warningKey = `budget-warning-${period}`;
    // notifyOnce: fires at most once per key (persisted). clearAlertFor: re-arms a key when
    // the user crosses back under, so it CAN fire again on the next genuine crossing.
    if (over) {
      notifyOnce({
        key: exceededKey,
        type: "budget_exceeded",
        title: "Budget exceeded",
        body: `You've gone over your ${label} ${scope}budget of ${formatCurrency(limit, displayCurrency)}.`
      });
      clearAlertFor(warningKey); // re-arm warning so it fires again if you drop back into 80-100%
    } else if (pct >= 80) {
      notifyOnce({
        key: warningKey,
        type: "budget_warning",
        title: "Approaching budget",
        body: `You've used ${Math.round(pct)}% of your ${label} ${scope}budget.`
      });
      clearAlertFor(exceededKey);
    } else {
      clearAlertFor(exceededKey);
      clearAlertFor(warningKey);
    }
  }, [loading, limit, total, pct, over, period, mode, periodLabel, displayCurrency, loadedPeriod, alertsReady, notifyOnce, clearAlertFor]);
  const saveBudgetValue = async () => {
    const n = parseFloat(budgetInput);
    if (!Number.isFinite(n) || n < 0) return setEditingBudget(false);
    setSaving(true);
    try {
      const b = await saveBudget(period, n);
      setBudget(b);
      setEditingBudget(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    } finally {
      setSaving(false);
    }
  };
  const doDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    try {
      await deleteReceipt(target.id);
      setRows(rs => rs.filter(r => r.id !== target.id));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    }
  };
  const enterSelect = id => {
    setSelectMode(true);
    setSelected(id ? new Set([id]) : new Set());
    setExpandedId(null);
    Haptics.selectionAsync().catch(() => {});
  };
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const toggleSelected = id => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);else n.add(id);
      return n;
    });
    Haptics.selectionAsync().catch(() => {});
  };
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(r => selected.has(r.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelected(new Set());else setSelected(new Set(visibleRows.map(r => r.id)));
  };
  const doBulkDelete = async () => {
    setConfirmBulk(false);
    const ids = [...selected];
    if (!ids.length) return exitSelect();
    try {
      await deleteReceipts(ids);
      const idSet = new Set(ids);
      setRows(rs => rs.filter(r => !idSet.has(r.id)));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      exitSelect();
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    }
  };
  // Open the edit modal pre-filled with the receipt's current values. Uses the same
  // ReceiptEditModal as the scan flow — DB row shape (merchant_name/transaction_date/...)
  // is translated to the parser's `parsed` shape (merchantName/date/...) the modal expects.
  const rowToParsed = (r) => ({
    merchantName: r.merchant_name,
    date: r.transaction_date,
    totalAmount: Number(r.total_amount) || 0,
    currency: r.currency || "PKR",
    summary: r.summary || null,
    items: Array.isArray(r.items) ? r.items : [],
  });
  const saveEdit = async (fields) => {
    const target = editing;
    if (!target) return;
    setSavingEdit(true);
    try {
      const updated = await updateReceipt(target.id, fields);
      setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      setEditing(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      alert("Error", e.message, null, { tone: "error" });
    } finally {
      setSavingEdit(false);
    }
  };
  const renderRow = r => {
    const cur = r.currency || "PKR";
    const open = !selectMode && expandedId === r.id;
    const isSel = selected.has(r.id);
    return <View key={r.id} style={[styles.card, shadow(1), {
      overflow: "hidden"
    }, selectMode && isSel && {
      borderColor: colors.primary
    }]}>
        <Pressable onPress={() => selectMode ? toggleSelected(r.id) : setExpandedId(open ? null : r.id)} onLongPress={() => !selectMode && enterSelect(r.id)} delayLongPress={280} android_ripple={{
        color: colors.muted
      }} style={({
        pressed
      }) => [styles.between, pressed && {
        opacity: 0.85
      }]}>
          {selectMode && <View style={[styles.checkCircle, isSel && styles.checkCircleOn]}>
              {isSel && <Check size={14} color={colors.primaryOn} />}
            </View>}
          <View style={{
          flex: 1
        }}>
            <Text style={styles.merchant}>{r.merchant_name}</Text>
            <Text style={[styles.muted, {
            marginTop: 4
          }]}>{formatDate(r.transaction_date)}</Text>
          </View>
          <View style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6
        }}>
            <Text style={styles.rowTotal}>{formatCurrency(r.total_amount, cur)}</Text>
            {!selectMode && (open ? <ChevronUp size={16} color={colors.fgMuted} /> : <ChevronDown size={16} color={colors.fgMuted} />)}
          </View>
        </Pressable>

        {open && <View style={{
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 10
      }}>
            {r.summary ? <Text style={[styles.muted, {
          marginBottom: 8
        }]}>{r.summary}</Text> : null}
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Pressable onPress={() => setEditing(r)} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}>
                <SquarePen size={16} color={colors.fg} />
                <Text style={[styles.deleteTxt, { color: colors.fg }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => setPendingDelete({ id: r.id, merchant: r.merchant_name })} style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}>
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.deleteTxt}>Delete</Text>
              </Pressable>
            </View>
          </View>}
      </View>;
  };
  return <ScrollView style={{
    flex: 1,
    backgroundColor: "transparent"
  }} contentContainerStyle={{
    padding: 16,
    paddingBottom: 40
  }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}>
      <View style={styles.periodRow}>
        {}
        <View style={styles.segment}>
          {["year", "month"].map(m => {
          const active = mode === m;
          return <Pressable key={m} onPress={() => setMode(m)} style={[styles.segBtn, active && styles.segBtnActive]}>
                <Text style={[styles.segTxt, active && styles.segTxtActive]}>{m === "year" ? "Yearly" : "Monthly"}</Text>
              </Pressable>;
        })}
        </View>

        {}
        <View style={{
        flex: 1
      }}>
          {mode === "year" ? <View style={styles.yearStepper}>
              <Pressable onPress={() => setYear(y => String(Number(y) - 1))} hitSlop={8} style={({
            pressed
          }) => [styles.yearArrow, pressed && {
            opacity: 0.6
          }]}>
                <ChevronLeft size={22} color={colors.fg} />
              </Pressable>
              <Text style={styles.yearText}>{year}</Text>
              <Pressable onPress={() => {
            if (Number(year) < Number(curYear)) setYear(y => String(Number(y) + 1));
          }} disabled={Number(year) >= Number(curYear)} hitSlop={8} style={({
            pressed
          }) => [styles.yearArrow, Number(year) >= Number(curYear) && {
            opacity: 0.3
          }, pressed && Number(year) < Number(curYear) && {
            opacity: 0.6
          }]}>
                <ChevronRight size={22} color={colors.fg} />
              </Pressable>
            </View> : <MonthPicker value={month} onChange={setMonth} />}
        </View>
      </View>

      {loading && rows.length === 0 ? <>
          <Skeleton height={132} style={{
        borderRadius: radius.xl,
        marginBottom: 14
      }} />
          <View style={{
        flexDirection: "row",
        gap: 12,
        marginBottom: 14
      }}>
            <Skeleton height={84} style={{
          flex: 1,
          borderRadius: radius.lg
        }} />
            <Skeleton height={84} style={{
          flex: 1,
          borderRadius: radius.lg
        }} />
          </View>
          <Skeleton height={130} style={{
        borderRadius: radius.lg,
        marginBottom: 14
      }} />
          <Skeleton height={160} style={{
        borderRadius: radius.lg
      }} />
        </> : <>
          <LinearGradient colors={gradients.hero} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 1
      }} style={[styles.hero, shadow(2)]}>
            <Text style={styles.heroLabel}>TOTAL SPENT</Text>
            <Text style={styles.heroValue}>{formatCurrency(total, displayCurrency)}</Text>
            <Text style={styles.heroSub}>{rows.length} receipt{rows.length === 1 ? "" : "s"} · {periodLabel}</Text>
          </LinearGradient>

          <View style={styles.kpiRow}>
            <View style={[styles.card, styles.kpi, shadow(1)]}>
              <Text style={styles.kpiLabel}>Receipts</Text>
              <Text style={styles.kpiValue}>{count}</Text>
            </View>
            <View style={[styles.card, styles.kpi, shadow(1)]}>
              <Text style={styles.kpiLabel}>Avg / receipt</Text>
              <Text style={styles.kpiValue}>{count ? formatCurrency(avg, displayCurrency) : "—"}</Text>
            </View>
          </View>

          {mixed && <Text style={[styles.muted, {
        fontSize: 12,
        marginBottom: 12
      }]}>Multiple currencies; totals shown in {displayCurrency}.</Text>}

          {}
          <View style={[styles.card, shadow(1)]}>
            <View style={styles.between}>
              <Text style={styles.cardTitle}>{mode === "year" ? "Yearly" : "Monthly"} budget</Text>
              {!editingBudget && <Pressable onPress={() => {
            setBudgetInput(limit > 0 ? String(limit) : "");
            setEditingBudget(true);
          }} hitSlop={8}>
                  <Text style={styles.editLink}>{limit > 0 ? "Edit" : "Set"}</Text>
                </Pressable>}
            </View>
            {editingBudget ? <View style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 12,
          alignItems: "center"
        }}>
                <TextInput value={budgetInput} onChangeText={setBudgetInput} keyboardType="decimal-pad" placeholder="e.g. 1500" placeholderTextColor={colors.fgMuted} style={styles.budgetInput} autoFocus />
                <Pressable onPress={saveBudgetValue} style={styles.iconBtn} disabled={saving}>
                  {saving ? <ActivityIndicator color={colors.fg} /> : <Check size={20} color={colors.fg} />}
                </Pressable>
                <Pressable onPress={() => setEditingBudget(false)} style={styles.iconBtn}>
                  <X size={20} color={colors.fg} />
                </Pressable>
              </View> : <>
                <Text style={[styles.kpiValue, {
            color: budgetColor,
            marginTop: 8
          }]}>{formatCurrency(total, displayCurrency)}</Text>
                <Text style={styles.muted}>{limit > 0 ? `of ${formatCurrency(limit, displayCurrency)} budget` : "No budget set yet"}</Text>
                <View style={styles.track}><View style={[styles.fill, {
              width: `${pct}%`,
              backgroundColor: budgetColor
            }]} /></View>
                {limit > 0 && <Text style={{
            color: budgetColor,
            fontFamily: fonts.semibold,
            fontSize: 13
          }}>
                    {over ? `${formatCurrency(total - limit, displayCurrency)} over` : `${formatCurrency(limit - total, displayCurrency)} left`}
                  </Text>}
              </>}
          </View>

          {}
          <Text style={[styles.cardTitle, {
        marginTop: 8,
        marginBottom: 10
      }]}>
            Transactions ({visibleRows.length}{visibleRows.length !== rows.length ? ` of ${rows.length}` : ""})
          </Text>

          {}
          {rows.length > 0 && (selectMode ? <View style={styles.searchRow}>
              <Pressable onPress={exitSelect} hitSlop={8} style={({
          pressed
        }) => [styles.sortPill, pressed && {
          opacity: 0.7
        }]} accessibilityLabel="Exit selection">
                <X size={20} color={colors.fg} />
              </Pressable>
              <Text style={styles.selCount}>{selected.size} selected</Text>
              <Pressable onPress={toggleSelectAll} hitSlop={8} style={({
          pressed
        }) => [styles.selAllPill, pressed && {
          opacity: 0.7
        }]}>
                <Text style={styles.selAllTxt}>{allVisibleSelected ? "None" : "All"}</Text>
              </Pressable>
              <Pressable onPress={() => selected.size > 0 && setConfirmBulk(true)} disabled={selected.size === 0} hitSlop={8} style={({
          pressed
        }) => [styles.sortPill, selected.size === 0 && {
          opacity: 0.35
        }, pressed && selected.size > 0 && {
          opacity: 0.7
        }]} accessibilityLabel="Delete selected">
                <Trash2 size={20} color={colors.danger} />
              </Pressable>
            </View> : <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={16} color={colors.fgMuted} />
                <TextInput value={query} onChangeText={setQuery} placeholder="Search merchant" placeholderTextColor={colors.fgMuted} style={styles.searchInput} autoCapitalize="none" />
                {query ? <Pressable onPress={() => setQuery("")} hitSlop={8}>
                    <CircleX size={16} color={colors.fgMuted} />
                  </Pressable> : null}
              </View>
              <Pressable onPress={() => enterSelect()} style={({
          pressed
        }) => [styles.sortPill, pressed && {
          opacity: 0.7
        }]} accessibilityLabel="Select receipts">
                <ListChecks size={18} color={colors.fg} />
              </Pressable>
              <Pressable onPress={() => setSortOpen(true)} style={({
          pressed
        }) => [styles.sortPill, pressed && {
          opacity: 0.7
        }]}>
                <ArrowUpDown size={18} color={colors.fg} />
              </Pressable>
            </View>)}

          {}
          {rows.length === 0 ? <View style={[styles.card, shadow(1), {
        alignItems: "center",
        paddingVertical: 30
      }]}>
              <ReceiptText size={30} color={colors.fgMuted} />
              <Text style={[styles.muted, {
          marginTop: 8
        }]}>No receipts for {periodLabel}.</Text>
            </View> : visibleRows.length === 0 ? <View style={[styles.card, shadow(1), {
        alignItems: "center",
        paddingVertical: 30
      }]}>
              <Search size={28} color={colors.fgMuted} />
              <Text style={[styles.muted, {
          marginTop: 8
        }]}>No receipts match your search.</Text>
            </View> : visibleRows.map(renderRow)}
        </>}

      {}
      <Modal visible={sortOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)}>
          <Pressable style={[styles.sortSheet, shadow(2)]} onPress={() => {}}>
            <Text style={styles.heading}>Sort by</Text>
            {SORT_OPTIONS.map(opt => {
            const active = sortBy === opt.key;
            return <Pressable key={opt.key} onPress={() => {
              setSortBy(opt.key);
              setSortOpen(false);
            }} style={({
              pressed
            }) => [styles.sortOpt, pressed && {
              backgroundColor: colors.muted
            }]}>
                  <Text style={[styles.sortOptTxt, active && {
                color: colors.primary,
                fontFamily: fonts.semibold
              }]}>{opt.label}</Text>
                  {active && <Check size={18} color={colors.primary} />}
                </Pressable>;
          })}
          </Pressable>
        </Pressable>
      </Modal>

      <ReceiptEditModal
        visible={!!editing}
        parsed={editing ? rowToParsed(editing) : null}
        saving={savingEdit}
        title="Edit receipt"
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      />

      <ConfirmDialog visible={!!pendingDelete} destructive icon={Trash2} title="Delete receipt?" message={pendingDelete ? `This permanently removes the receipt from ${pendingDelete.merchant}.` : ""} confirmLabel="Delete" onConfirm={doDelete} onCancel={() => setPendingDelete(null)} />

      <ConfirmDialog visible={confirmBulk} destructive icon={Trash2} title={`Delete ${selected.size} receipt${selected.size === 1 ? "" : "s"}?`} message="This permanently removes the selected receipts from this device." confirmLabel="Delete" onConfirm={doBulkDelete} onCancel={() => setConfirmBulk(false)} />
    </ScrollView>;
}
const makeStyles = colors => StyleSheet.create({
  muted: {
    color: colors.fgMuted,
    fontFamily: fonts.regular
  },
  val: {
    color: colors.fg,
    fontVariant: ["tabular-nums"],
    fontFamily: fonts.semibold
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14
  },
  cardTitle: {
    color: colors.fgMuted,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  editLink: {
    color: colors.primary,
    fontFamily: fonts.semibold
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16
  },
  segment: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4
  },
  segBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  segBtnActive: {
    backgroundColor: colors.primary
  },
  segTxt: {
    color: colors.fgMuted,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  segTxtActive: {
    color: colors.primaryOn
  },
  yearStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  yearArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  yearText: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontSize: 17,
    fontVariant: ["tabular-nums"]
  },
  hero: {
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 14
  },
  heroLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: fonts.semibold,
    letterSpacing: 1
  },
  heroValue: {
    color: "#fff",
    fontSize: 40,
    fontFamily: fonts.bold,
    marginVertical: 4,
    fontVariant: ["tabular-nums"]
  },
  heroSub: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: fonts.medium
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12
  },
  kpi: {
    flex: 1
  },
  kpiLabel: {
    color: colors.fgMuted,
    fontSize: 12,
    fontFamily: fonts.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  kpiValue: {
    color: colors.fg,
    fontSize: 22,
    fontFamily: fonts.bold,
    marginVertical: 4,
    fontVariant: ["tabular-nums"]
  },
  kpiValueSm: {
    color: colors.fg,
    fontSize: 17,
    fontFamily: fonts.bold,
    marginVertical: 4
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  catName: {
    color: colors.fg,
    fontFamily: fonts.medium
  },
  track: {
    height: 10,
    backgroundColor: colors.muted,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginVertical: 8
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill
  },
  budgetInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    color: colors.fg,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.regular
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 46
  },
  searchInput: {
    flex: 1,
    color: colors.fg,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 0
  },
  sortPill: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.fgMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  checkCircleOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  selCount: {
    flex: 1,
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 15,
    paddingHorizontal: 4
  },
  selAllPill: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  selAllTxt: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 14
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipTxt: {
    color: colors.fg,
    fontFamily: fonts.medium,
    fontSize: 13
  },
  chipTxtActive: {
    color: colors.primaryOn,
    fontFamily: fonts.semibold
  },
  merchant: {
    color: colors.fg,
    fontFamily: fonts.semibold,
    fontSize: 15
  },
  rowTotal: {
    color: colors.fg,
    fontFamily: fonts.bold,
    fontVariant: ["tabular-nums"]
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 6
  },
  deleteTxt: {
    color: colors.danger,
    fontFamily: fonts.semibold
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  sortSheet: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12
  },
  heading: {
    color: colors.fgMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingVertical: 8
  },
  sortOpt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.md
  },
  sortOptTxt: {
    color: colors.fg,
    fontFamily: fonts.regular,
    fontSize: 16
  }
});