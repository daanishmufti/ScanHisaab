const FOLD = {
  "0": "O",
  "1": "I",
  "5": "S",
  "8": "B",
  "2": "Z"
};
const squash = s => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/[01258]/g, d => FOLD[d]);
const NOISE = /\b(PVT|PRIVATE|LTD|LIMITED|LLC|INC|CO|COMPANY|STORE|STORES|SHOP|SUPER ?MARKET|MART|TRADERS|ENTERPRISES|AND|THE)\b/gi;
const stripNoise = s => squash((s || "").replace(NOISE, " "));
function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag : 1 + Math.min(diag, prev[j], prev[j - 1]);
      diag = tmp;
    }
  }
  return prev[n];
}
export function similarity(a, b) {
  const x = squash(a),
    y = squash(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) {
    return 0.88 + 0.12 * (Math.min(x.length, y.length) / Math.max(x.length, y.length));
  }
  let xs = stripNoise(a),
    ys = stripNoise(b);
  if (!xs || !ys) {
    xs = x;
    ys = y;
  }
  const dist = levenshtein(xs, ys);
  return 1 - dist / Math.max(xs.length, ys.length);
}
export function matchKnownMerchant(name, known, threshold = 0.84) {
  if (squash(name).length < 3 || !Array.isArray(known) || !known.length) return null;
  let best = null,
    bestScore = 0;
  for (const k of known) {
    const score = similarity(name, k);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return bestScore >= threshold ? best : null;
}
export function cleanMerchantName(name) {
  return (name || "").replace(/\s+/g, " ").trim().replace(/[|.,;:_\-\s]+$/, "").slice(0, 80);
}
export function normalizeMerchant(name, known) {
  return matchKnownMerchant(name, known) || cleanMerchantName(name);
}