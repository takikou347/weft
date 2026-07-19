// 立替精算の計算(F-07-6)。送金はせず、記録と計算のみ(§9)

export type SettlementEntry = {
  payerId: string;
  amount: number; // 円(正の整数)
  participants: string[]; // 割り勘の対象者(payer を含む)
};

export type Transfer = {
  from: string;
  to: string;
  amount: number;
};

// 各人の収支(プラス=受け取る側、マイナス=払う側)
export function netBalances(entries: SettlementEntry[]): Map<string, number> {
  const balance = new Map<string, number>();
  const add = (id: string, v: number) =>
    balance.set(id, (balance.get(id) ?? 0) + v);

  for (const e of entries) {
    if (e.participants.length === 0) continue;
    add(e.payerId, e.amount);
    // 割り切れない分(余り)は払った人が負担する(1円単位の公平さより簡明さ)
    const share = Math.floor(e.amount / e.participants.length);
    const remainder = e.amount - share * e.participants.length;
    for (const p of e.participants) {
      add(p, -share);
    }
    add(e.payerId, -remainder);
  }
  return balance;
}

// 精算案: 「誰が誰にいくら払うか」を最小の回数に近い形で提示する(貪欲法)
export function settlementPlan(entries: SettlementEntry[]): Transfer[] {
  const balance = netBalances(entries);
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];
  for (const [id, v] of balance) {
    if (v > 0) creditors.push({ id, amount: v });
    else if (v < 0) debtors.push({ id, amount: -v });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const pay = Math.min(creditors[ci].amount, debtors[di].amount);
    if (pay > 0) {
      transfers.push({
        from: debtors[di].id,
        to: creditors[ci].id,
        amount: pay,
      });
    }
    creditors[ci].amount -= pay;
    debtors[di].amount -= pay;
    if (creditors[ci].amount === 0) ci++;
    if (debtors[di].amount === 0) di++;
  }
  return transfers;
}
