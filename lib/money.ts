// All amounts are stored and handled as whole rupees (pre-tax, GST excluded).

export function computeMargins(closed: number, fee: number, direct: number) {
  const net = closed - direct;        // Net margin = Closed - Direct expense
  const gross = net + fee;            // Gross margin = Net margin + Agency fee
  return { net, gross };
}

// Indian number formatting: 2,40,000
export function formatINR(n: number): string {
  const sign = n < 0 ? "-" : "";
  const s = Math.abs(Math.round(n)).toString();
  if (s.length <= 3) return `${sign}₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}₹${grouped},${last3}`;
}

// Plain grouped number without the ₹ symbol (for table cells that show a ₹ header)
export function groupINR(n: number): string {
  return formatINR(n).replace("₹", "");
}
