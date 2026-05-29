import AsyncStorage from "@react-native-async-storage/async-storage";
import { recognizeReceipt } from "./receiptOcr";
import { parseReceipt } from "./receiptParser";
import { normalizeMerchant } from "./merchantMatch";
const RECEIPTS_KEY = "scanhisaab.receipts";
const BUDGETS_KEY = "scanhisaab.budgets";
const SETTINGS_KEY = "scanhisaab.settings";
export const NOTIFICATIONS_KEY = "scanhisaab.notifications.local";
async function readJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
async function writeJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const blankParsed = () => ({
  merchantName: "",
  date: new Date().toISOString().slice(0, 10),
  totalAmount: 0,
  currency: "PKR",
  summary: null,
  items: [],
  needsInput: true,
  missing: ["seller", "total"]
});
let _merchantCache = {
  at: 0,
  list: []
};
const _listeners = new Set();
export function onDataChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
function emit() {
  for (const fn of _listeners) try {
    fn();
  } catch {}
}
export async function processReceipt(asset) {
  const ocr = await recognizeReceipt(asset.uri);
  const parsed = parseReceipt(ocr) || blankParsed();
  if (parsed.merchantName) {
    const known = await getKnownMerchants();
    parsed.merchantName = normalizeMerchant(parsed.merchantName, known);
  }
  try {
    const dbg = (ocr.blocks || []).flatMap(b => (b.lines || []).map(l => ({
      t: l.text,
      ...(l.frame || {})
    })));
    console.log("[scan][ocr]", JSON.stringify(dbg));
    console.log("[scan][parsed]", JSON.stringify(parsed));
  } catch {}
  if (parsed.needsInput) return {
    receipt: null,
    parsed,
    needsInput: true
  };
  const receipt = await createReceipt({
    merchant: parsed.merchantName,
    date: parsed.date,
    total: parsed.totalAmount,
    currency: parsed.currency,
    summary: parsed.summary,
    items: []
  });
  return {
    receipt,
    parsed,
    needsInput: false
  };
}
export function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  return {
    start: `${month}-01`,
    end: new Date(y, m, 0).toISOString().slice(0, 10)
  };
}
export function periodRange(period) {
  if (/^\d{4}$/.test(period)) return {
    start: `${period}-01-01`,
    end: `${period}-12-31`
  };
  return monthRange(period);
}
export async function getReceipts(period) {
  const {
    start,
    end
  } = periodRange(period);
  const all = await readJSON(RECEIPTS_KEY, []);
  return all.filter(r => r.transaction_date >= start && r.transaction_date <= end).sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)));
}
export async function getMostRecentReceiptMonth() {
  const all = await readJSON(RECEIPTS_KEY, []);
  if (!all.length) return null;
  const newest = [...all].sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];
  return newest?.transaction_date ? newest.transaction_date.slice(0, 7) : null;
}
export async function getBudget(period) {
  const budgets = await readJSON(BUDGETS_KEY, {});
  const limit = budgets[period];
  return limit != null ? {
    target_month: period,
    monthly_limit: limit
  } : null;
}
export async function saveBudget(period, limit) {
  const budgets = await readJSON(BUDGETS_KEY, {});
  budgets[period] = limit;
  await writeJSON(BUDGETS_KEY, budgets);
  emit();
  return {
    target_month: period,
    monthly_limit: limit
  };
}
export async function deleteReceipt(id) {
  const all = await readJSON(RECEIPTS_KEY, []);
  await writeJSON(RECEIPTS_KEY, all.filter(r => r.id !== id));
  _merchantCache = { at: 0, list: [] };
  emit();
}
export async function deleteReceipts(ids) {
  if (!ids || !ids.length) return 0;
  const set = new Set(ids);
  const all = await readJSON(RECEIPTS_KEY, []);
  const next = all.filter(r => !set.has(r.id));
  await writeJSON(RECEIPTS_KEY, next);
  _merchantCache = { at: 0, list: [] };
  emit();
  return all.length - next.length;
}
export async function clearAllReceipts() {
  await AsyncStorage.removeItem(RECEIPTS_KEY);
  _merchantCache = { at: 0, list: [] };
  emit();
}
export async function updateReceipt(id, fields) {
  const all = await readJSON(RECEIPTS_KEY, []);
  let updated = null;
  const next = all.map(r => {
    if (r.id !== id) return r;
    updated = {
      ...r,
      merchant_name: fields.merchant,
      transaction_date: fields.date,
      total_amount: fields.total,
      currency: fields.currency || "PKR",
      summary: fields.summary ?? null,
      items: Array.isArray(fields.items) ? fields.items : []
    };
    return updated;
  });
  await writeJSON(RECEIPTS_KEY, next);
  _merchantCache = { at: 0, list: [] };
  emit();
  return updated;
}
export async function createReceipt(fields) {
  const receipt = {
    id: newId(),
    merchant_name: fields.merchant,
    transaction_date: fields.date,
    total_amount: fields.total,
    currency: fields.currency || "PKR",
    items: Array.isArray(fields.items) ? fields.items : [],
    summary: fields.summary || null,
    image_url: null,
    created_at: Date.now()
  };
  const all = await readJSON(RECEIPTS_KEY, []);
  await writeJSON(RECEIPTS_KEY, [receipt, ...all]);
  _merchantCache.at = 0;
  emit();
  return receipt;
}
export async function getKnownMerchants(force = false) {
  if (!force && Date.now() - _merchantCache.at < 60000 && _merchantCache.list.length) {
    return _merchantCache.list;
  }
  const all = await readJSON(RECEIPTS_KEY, []);
  const counts = new Map();
  for (const r of all) {
    const m = (r.merchant_name || "").trim();
    if (m && m.toLowerCase() !== "unknown") counts.set(m, (counts.get(m) || 0) + 1);
  }
  const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  _merchantCache = {
    at: Date.now(),
    list
  };
  return list;
}
export async function getDefaultCurrency() {
  const s = await readJSON(SETTINGS_KEY, {});
  return s.currency || "PKR";
}
export async function setDefaultCurrency(currency) {
  const s = await readJSON(SETTINGS_KEY, {});
  s.currency = currency;
  await writeJSON(SETTINGS_KEY, s);
}
export async function getNotificationsEnabled() {
  const s = await readJSON(SETTINGS_KEY, {});
  return s.notificationsEnabled !== false;
}
export async function setNotificationsEnabled(enabled) {
  const s = await readJSON(SETTINGS_KEY, {});
  s.notificationsEnabled = !!enabled;
  await writeJSON(SETTINGS_KEY, s);
}
export async function clearAllData() {
  await AsyncStorage.multiRemove([RECEIPTS_KEY, BUDGETS_KEY, NOTIFICATIONS_KEY, "scanhisaab.budget.alerted", "scanhisaab.help.seen"]);
  _merchantCache = {
    at: 0,
    list: []
  };
  emit();
}