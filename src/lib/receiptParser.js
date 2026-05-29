const SYMBOL_TO_CODE = {
  "₨": "PKR",
  "₹": "INR",
  "$": "USD",
  "£": "GBP",
  "€": "EUR"
};
const CODE_RE = /\b(PKR|INR|USD|GBP|EUR|AED|SAR)\b/i;
const AMOUNT_SRC = "(?:rs\\.?|pkr|inr|usd|aed|sar|₨|₹|\\$|£|€)?\\s*(\\d{1,3}(?:,\\d{2,3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)";
const AMOUNT_G = new RegExp(AMOUNT_SRC, "gi");
const GRAND_RE = /\b(grand\s*total|net\s*total|net\s*(?:amount|payable)|total\s*(?:payable|due)|amount\s*(?:due|payable)|balance\s*(?:due|payable)?|to\s*pay)\b/i;
const TOTAL_RE = /\b(grand\s*total|net\s*total|total\s*(?:amount|amt|due|payable|paid|bill)?|amount\s*(?:due|payable)|amt\s*due|bal(?:ance)?\s*due|net\s*(?:amount|payable)|payable|to\s*pay|bill\s*total)\b/i;
const TOTAL_EXCLUDE_RE = /\b(total\s*(?:items?|item\s*count|qty|quantity|units?|pieces?|nos?|no\.?\s*of)|items?\s*total|qty\s*total|no\.?\s*of\s*items?)\b/i;
const NON_MERCHANT_RE = /\b(receipt|tax\s*invoice|invoice\s*(?:no|#)|cash\s*memo|bill\s*no|tel|phone|fax|ntn|strn|www\.|https?:|terms|thank\s*you)/i;
const ADDRESSY_RE = /\b(road|rd\b|street|st\b|plaza|market|shop\s*#?\s*\d|branch|floor|block|sector|phase|town|near|opp\b|opposite|po\s*box|p\.?o\.?\b|uan|helpline|hotline|call|email|gmail|outlook|hotmail|\.com|\.pk|\.org)\b|@|#\s*\d|\d{3,}[-\s]\d{3,}/i;
const NOISE_LINE_RE = /\d{7,}|\b\d{1,2}:\d{2}\b|\b(ntn|strn|smid|barcode|counter|ref|txn|cnic|imei|po\s*no)\b/i;
const SLOGAN_RE = /\b(we\s+deliver|now\s+we|home\s*deliver|free\s*deliver|order\s*(?:online|now|here)|welcome|thank\s*you|follow\s*us|cash\s*(?:&|and)\s*carry|since\s+\d|est\.?\s+\d|all\s+rights|powered\s+by|customer\s*copy|our\s+menu|scan\s+to)\b/i;
const deburrKw = t => (t || "").toLowerCase().replace(/0/g, "o").replace(/1/g, "l").replace(/5/g, "s").replace(/8/g, "b");
function amountsIn(line) {
  const out = [];
  let m;
  AMOUNT_G.lastIndex = 0;
  while ((m = AMOUNT_G.exec(line)) !== null) {
    if (!m[1]) continue;
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isFinite(v) && v > 0) out.push(v);
  }
  return out;
}
const lastAmount = line => {
  const a = amountsIn(line);
  return a.length ? a[a.length - 1] : null;
};
const isAmountOnly = line => !/[A-Za-z]{2,}/.test(line) && amountsIn(line).length > 0;
const round2 = n => Math.round(n * 100) / 100;
function resolveCurrency(text) {
  const code = text.match(CODE_RE);
  if (code) return code[1].toUpperCase();
  for (const sym of Object.keys(SYMBOL_TO_CODE)) if (text.includes(sym)) return SYMBOL_TO_CODE[sym];
  if (/\brs\.?\b/i.test(text)) return "PKR";
  return "PKR";
}
const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
};
function parseDate(text) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return toIso(+iso[1], +iso[2], +iso[3]);
  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
  if (dmy) {
    let y = +dmy[3];
    if (y < 100) y += 2000;
    const a = +dmy[1],
      b = +dmy[2];
    const [mon, day] = a > 12 ? [b, a] : b > 12 ? [a, b] : [b, a];
    return toIso(y, mon, day);
  }
  const named = text.match(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*(20\d{2})\b/i) || text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})\s*,?\s*(20\d{2})\b/i);
  if (named) {
    const mon = MONTHS[(named[1].length <= 2 ? named[2] : named[1]).slice(0, 3).toLowerCase()];
    const day = +(named[1].length <= 2 ? named[1] : named[2]);
    return toIso(+named[3], mon, day);
  }
  return null;
}
function toIso(y, m, d) {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDateLabeled(lines, fullText) {
  for (const l of lines || []) {
    if (/\b(date|dated|invoice\s*date|bill\s*date|order\s*date)\b/i.test(l.text)) {
      const d = parseDate(l.text);
      if (d) return d;
    }
  }
  return parseDate(fullText);
}
const PURE_NUM_RE = /^[\s$₨₹£€]*\d[\d,.\s%]*$/;
const DIGIT_FIX = {
  O: "0",
  o: "0",
  S: "5",
  s: "5",
  B: "8",
  l: "1",
  I: "1",
  "|": "1",
  Z: "2"
};
const cleanNum = t => {
  const s = (t || "").trim();
  return /\d/.test(s) && /^[\dOoSsBlI|Z.,%\s$₨₹£€-]+$/.test(s) ? s.replace(/[OoSsBlI|Z]/g, c => DIGIT_FIX[c] || c) : s;
};
const isPureNum = t => {
  const c = cleanNum(t);
  return PURE_NUM_RE.test(c) && /\d/.test(c);
};
const numVal = t => {
  const m = cleanNum(t).replace(/[,%\s]/g, "").match(/\d+(?:\.\d{1,2})?/);
  return m ? parseFloat(m[0]) : null;
};
function flattenLines(blocks) {
  const lines = [];
  for (const b of blocks || []) {
    for (const ln of b.lines || []) {
      const t = (ln.text || "").trim();
      if (!t) continue;
      const f = ln.frame;
      lines.push({
        text: t,
        top: f ? f.top : null,
        left: f ? f.left : null,
        height: f ? f.height : null,
        right: f ? f.left + f.width : null
      });
    }
  }
  return lines;
}
function amountForRow(kwLine, amountLines, pageRight, colTol) {
  const onLine = amountsIn(kwLine.text);
  if (onLine.length) return onLine[onLine.length - 1];
  if (kwLine.top == null) return null;
  const h = kwLine.height || 20;
  const col = amountLines.filter(a => a.text !== kwLine.text && a.right >= pageRight - colTol);
  const same = col.filter(a => Math.abs(a.top - kwLine.top) <= h * 1.0);
  if (same.length) {
    same.sort((a, b) => b.right - a.right);
    return same[0].value;
  }
  const below = col.filter(a => a.top > kwLine.top && a.top <= kwLine.top + h * 1.9);
  if (below.length) {
    below.sort((a, b) => a.top - kwLine.top - (b.top - kwLine.top) || b.right - a.right);
    return below[0].value;
  }
  const any = amountLines.filter(a => a.text !== kwLine.text && Math.abs(a.top - kwLine.top) <= h * 1.0).sort((a, b) => b.right - a.right);
  return any.length ? any[0].value : null;
}
export function parseReceipt(result) {
  const lines = flattenLines(result && result.blocks);
  const haveGeo = lines.length > 0 && lines.every(l => l.top != null && l.right != null);
  if (!haveGeo) return parseReceiptText(result && result.text || lines.map(l => l.text).join("\n"));
  lines.sort((a, b) => a.top - b.top || a.left - b.left);
  const fullText = lines.map(l => l.text).join("\n");
  let pageRight = 0;
  for (const l of lines) if (l.right > pageRight) pageRight = l.right;
  const colTol = Math.max(60, pageRight * 0.18);
  const minTop = lines[0].top;
  const maxBottom = Math.max(...lines.map(l => l.top + (l.height || 0)));
  const amountLines = [];
  for (const l of lines) {
    if (NOISE_LINE_RE.test(l.text)) continue;
    const a = amountsIn(l.text);
    const v = isPureNum(l.text) ? numVal(l.text) : a.length ? a[a.length - 1] : null;
    if (v != null) amountLines.push({
      value: v,
      right: l.right,
      top: l.top,
      height: l.height,
      text: l.text
    });
  }
  const grandCands = [],
    totalCands = [];
  for (const l of lines) {
    const kw = deburrKw(l.text);
    if (!TOTAL_RE.test(kw) || TOTAL_EXCLUDE_RE.test(kw)) continue;
    const v = amountForRow(l, amountLines, pageRight, colTol);
    if (v == null) continue;
    totalCands.push(v);
    if (GRAND_RE.test(kw)) grandCands.push(v);
  }
  const totalAnchored = grandCands.length > 0 || totalCands.length > 0;
  let totalAmount = grandCands.length ? Math.max(...grandCands) : totalCands.length ? Math.max(...totalCands) : null;
  if (totalAmount == null) {
    const col = amountLines.filter(a => a.right >= pageRight - colTol);
    const pool = col.length ? col : amountLines;
    const cutoff = minTop + (maxBottom - minTop) * 0.55;
    const bottom = pool.filter(a => a.top >= cutoff);
    const pick = bottom.length ? bottom : pool;
    totalAmount = pick.length ? Math.max(...pick.map(a => a.value)) : 0;
  }
  const topZone = minTop + (maxBottom - minTop) * 0.4;
  const maxH = Math.max(...lines.map(l => l.height || 0)) || 1;
  const pageMid = pageRight / 2;
  const scoreLine = l => {
    const letters = (l.text.match(/[A-Za-z]/g) || []).length;
    const digits = (l.text.match(/\d/g) || []).length;
    const upper = (l.text.match(/[A-Z]/g) || []).length;
    const alnum = (l.text.match(/[A-Za-z0-9]/g) || []).length;
    let s = (l.height || 0) / maxH;
    s += (1 - (l.top - minTop) / Math.max(1, topZone - minTop)) * 0.5;
    if (l.left != null && Math.abs((l.left + l.right) / 2 - pageMid) <= pageRight * 0.18) s += 0.15;
    if (letters >= 3 && upper / Math.max(1, letters) >= 0.7) s += 0.12;
    if (letters >= 3 && l.text.length <= 30) s += 0.12;
    if (ADDRESSY_RE.test(l.text)) s -= 0.8;
    if (SLOGAN_RE.test(l.text)) s -= 0.9;
    if (digits > letters) s -= 0.6;
    if (alnum / Math.max(1, l.text.length) < 0.45) s -= 0.4;
    if (l.text.length > 42) s -= 0.3;
    return s;
  };
  const cands = lines.filter(l => l.top <= topZone && /[A-Za-z]{2,}/.test(l.text) && !NON_MERCHANT_RE.test(l.text) && !parseDate(l.text) && !isAmountOnly(l.text)).map(l => ({
    line: l,
    score: scoreLine(l)
  })).sort((a, b) => b.score - a.score);
  const sellerFound = cands.length > 0;
  let merchant = "Receipt";
  let merchantCandidates = [];
  if (sellerFound) {
    const best = cands[0].line;
    const bh = best.height || maxH;
    const big = cands.map(c => c.line).filter(l => (l.height || 0) >= bh * 0.78 && !SLOGAN_RE.test(l.text) && !ADDRESSY_RE.test(l.text)).sort((a, b) => a.top - b.top);
    let run = [best];
    const i0 = big.indexOf(best);
    if (i0 >= 0) {
      let a = i0,
        b = i0;
      while (a - 1 >= 0 && big[a].top - (big[a - 1].top + (big[a - 1].height || 0)) <= bh * 0.9) a--;
      while (b + 1 < big.length && big[b + 1].top - (big[b].top + (big[b].height || 0)) <= bh * 0.9) b++;
      run = big.slice(a, b + 1);
    }
    merchant = run.map(l => l.text).join(" ").replace(/\s+/g, " ").trim();
    merchantCandidates = [merchant, ...cands.slice(0, 4).map(c => c.line.text.replace(/\s+/g, " ").trim())].filter((v, i, arr) => v && arr.indexOf(v) === i).slice(0, 5);
  } else {
    merchant = pickMerchantText(lines.map(l => l.text)) || "Receipt";
  }
  const hasCurrency = CODE_RE.test(fullText) || /[₨₹$£€]/.test(fullText) || /\brs\.?\b/i.test(fullText);
  const bareNumberTotal = totalAmount > 0 && !totalAnchored && !hasCurrency;
  const missing = [];
  if (!sellerFound) missing.push("seller");
  if (!(totalAmount > 0)) missing.push("total");else if (bareNumberTotal) missing.push("amount");
  const needsInput = !sellerFound || !(totalAmount > 0) || bareNumberTotal;
  const confidence = needsInput ? "low" : totalAnchored ? "high" : "medium";
  return {
    merchantName: sellerFound ? merchant.replace(/\s+/g, " ").trim().slice(0, 80) : "",
    merchantCandidates: sellerFound ? merchantCandidates : [],
    date: parseDateLabeled(lines, fullText) || todayIso(),
    totalAmount: round2(totalAmount || 0),
    currency: resolveCurrency(fullText),
    summary: null,
    items: [],
    confidence,
    needsInput,
    missing
  };
}
function pickMerchantText(lines) {
  for (const raw of lines.slice(0, 6)) {
    const line = (raw || "").trim();
    if (line.length < 3) continue;
    const letters = (line.match(/[A-Za-z]/g) || []).length;
    const digits = (line.match(/\d/g) || []).length;
    if (letters < 3 || digits > letters) continue;
    if (NON_MERCHANT_RE.test(line) || ADDRESSY_RE.test(line)) continue;
    if (parseDate(line)) continue;
    return line.replace(/\s+/g, " ").slice(0, 80);
  }
  const first = (lines[0] || "").trim();
  return first ? first.slice(0, 80) : "Receipt";
}
export function parseReceiptText(text) {
  if (!text || !text.trim()) return null;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const grandCands = [],
    totalCands = [];
  let maxAmount = 0;
  for (const line of lines) {
    for (const a of amountsIn(line)) if (a > maxAmount) maxAmount = a;
    if (!TOTAL_RE.test(line) || TOTAL_EXCLUDE_RE.test(line)) continue;
    const a = lastAmount(line);
    if (a == null) continue;
    totalCands.push(a);
    if (GRAND_RE.test(line)) grandCands.push(a);
  }
  const totalAmount = grandCands.length ? Math.max(...grandCands) : totalCands.length ? Math.max(...totalCands) : maxAmount > 0 ? maxAmount : 0;
  const merchant = pickMerchantText(lines);
  return {
    merchantName: merchant,
    merchantCandidates: merchant ? [merchant] : [],
    date: parseDate(text) || todayIso(),
    totalAmount: round2(totalAmount),
    currency: resolveCurrency(text),
    summary: null,
    items: [],
    confidence: totalCands.length ? "high" : "medium",
    needsInput: false,
    missing: []
  };
}