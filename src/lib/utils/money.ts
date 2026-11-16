/**
 * All monetary amounts in Destination Diaries are integer paise (INR minor
 * units). These helpers keep arithmetic deterministic — no floats anywhere.
 */

export type Paise = bigint;

export function rupeesToPaise(rupees: number): bigint {
  if (!Number.isFinite(rupees)) throw new Error("Invalid rupee amount");
  // Round to the nearest paisa; inputs are user-entered rupee values.
  return BigInt(Math.round(rupees * 100));
}

export function paiseToRupees(paise: bigint): number {
  return Number(paise) / 100;
}

export function formatINR(paise: bigint, opts?: { compact?: boolean }): string {
  const rupees = Number(paise) / 100;
  if (opts?.compact && Math.abs(rupees) >= 100000) {
    if (Math.abs(rupees) >= 10000000) {
      return `₹${(rupees / 10000000).toFixed(rupees % 10000000 === 0 ? 0 : 1)} Cr`;
    }
    return `₹${(rupees / 100000).toFixed(rupees % 100000 === 0 ? 0 : 1)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function sumPaise(amounts: Iterable<bigint>): bigint {
  let total = 0n;
  for (const a of amounts) total += a;
  return total;
}

/** Integer division that distributes remainders: divides `total` into `parts`
 * near-equal integer shares (first shares get the remainder paise). */
export function splitPaise(total: bigint, parts: number): bigint[] {
  if (parts <= 0) throw new Error("parts must be positive");
  const p = BigInt(parts);
  const base = total / p;
  const remainder = total % p;
  return Array.from({ length: parts }, (_, i) =>
    i < Number(remainder) ? base + 1n : base,
  );
}

/** Per-person share, rounded up so budgets are never understated. */
export function perPersonPaise(total: bigint, travellers: number): bigint {
  if (travellers <= 0) throw new Error("travellers must be positive");
  const t = BigInt(travellers);
  return (total + t - 1n) / t;
}
