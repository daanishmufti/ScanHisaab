const SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "Rs ",
  PKR: "Rs ",
  JPY: "¥",
  CNY: "¥",
  AUD: "A$",
  CAD: "C$",
  BRL: "R$",
  AED: "AED ",
  SAR: "SAR "
};
export function formatCurrency(n, currency = "USD") {
  const v = Number(n) || 0;
  const code = (currency || "USD").toUpperCase();
  const sym = SYMBOLS[code] ?? `${code} `;
  const [int, dec] = Math.abs(v).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${v < 0 ? "-" : ""}${sym}${grouped}.${dec}`;
}
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function formatDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return `${MON[m - 1]} ${d}, ${y}`;
}
export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
export function monthLabel(m) {
  const [y, mo] = m.split("-").map(Number);
  return `${FULL[mo - 1]} ${y}`;
}
export function shiftMonth(m, delta) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1 + delta, 1).toISOString().slice(0, 7);
}