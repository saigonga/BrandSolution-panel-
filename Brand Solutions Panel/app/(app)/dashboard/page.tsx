import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import {
  closuresOn, getTeam, monthTotals, pendingBackfills, stageCounts, visibleProjects,
} from "@/lib/report";
import { emptyTotals, habitStats, habitWindowStart, loadFilledMap } from "@/lib/stats";
import { addDays, dayKey, dayStart, fmtLong, fmtMonth, fmtShort, isLocked } from "@/lib/time";
import { computeMargins, formatINR, groupINR } from "@/lib/money";
import Topbar from "@/components/Topbar";
import { BackfillDecision, OpenProjectButton } from "@/components/AttentionActions";

export const dynamic = "force-dynamic";

const STAGE_COLOR: Record<string, string> = {
  "Not started": "var(--slate)",
  "In progress": "var(--info)",
  "Sent for review": "var(--warn)",
  "Awaiting client": "var(--violet)",
  "Closed": "var(--good)",
  "Parked": "var(--ink-3)",
  "Dropped": "var(--crit)",
};

type ClosureRows = Awaited<ReturnType<typeof closuresOn>>;

function ClosureTable({ rows, empty }: { rows: ClosureRows; empty: string }) {
  const t = emptyTotals();
  for (const c of rows) {
    const { net, gross } = computeMargins(c.closedAmount, c.agencyFee, c.directExpense);
    t.closed += c.closedAmount; t.fee += c.agencyFee; t.direct += c.directExpense; t.net += net; t.gross += gross;
  }
  return (
    <div className="tblwrap">
      <table>
        <thead>
          <tr>
            <th>Person</th><th>Client</th><th>What closed</th>
            <th className="r">Closed</th><th className="r">Fee</th><th className="r">Direct</th><th className="r">Net</th><th className="r">Gross</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={8} className="muted">{empty}</td></tr>}
          {rows.map((c) => {
            const { net, gross } = computeMargins(c.closedAmount, c.agencyFee, c.directExpense);
            return (
              <tr key={c.id}>
                <td>{c.owner.name.split(" ")[0]}</td>
                <td>{c.client?.brand ?? "—"}{c.productCategory && <span className="subtle">{c.productCategory}</span>}</td>
                <td className="wrap">{c.description}</td>
                <td className="r money">{groupINR(c.closedAmount)}</td>
                <td className="r money">{groupINR(c.agencyFee)}</td>
                <td className="r money">{groupINR(c.directExpense)}</td>
                <td className={`r money ${net >= 0 ? "" : "neg"}`}>{groupINR(net)}</td>
                <td className={`r money ${gross >= 0 ? "" : "neg"}`}>{groupINR(gross)}</td>
              </tr>
            );
          })}
          {rows.length > 0 && (
            <tr className="total">
              <td colSpan={3}>Day total</td>
              <td className="r money">{groupINR(t.closed)}</td>
              <td className="r money">{groupINR(t.fee)}</td>
              <td className="r money">{groupINR(t.direct)}</td>
              <td className="r money">{groupINR(t.net)}</td>
              <td className="r money">{groupINR(t.gross)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function DashboardPage() {
  const me = await getUser();
  if (!me) redirect("/signin");
  if (me.role !== "MANAGER") redirect("/workspace");

  const now = new Date();
  const today = dayKey(now);
  const yesterday = addDays(today, -1);

  const [team, month, todayRows, yesterdayRows, projects, backfills, filledMap] = await Promise.all([
    getTeam(),
    monthTotals(now),
    closuresOn(today),
    closuresOn(yesterday),
    visibleProjects(now),
    pendingBackfills(),
    loadFilledMap(habitWindowStart(now)),
  ]);

  const counts = stageCounts(projects);
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const stale = projects.filter((p) => p.isStale);
  const overdue = projects.filter((p) => p.isOverdue && !p.isStale);
  const t = month.team;
  const attentionCount = backfills.length + stale.length + overdue.length;

  return (
    <>
      <Topbar title="Manager Dashboard" sub={`${me.name} · money & accountability`} />
      <section className="view">
        <div className="pad">
          <div className="sec-h first">
            <h2>Team · month to date</h2>
            <span className="hint">{fmtMonth(now)} · pre-tax</span>
            <span className="act">
              <a className="btn ghost sm" href="/api/cron/daily?preview=1" target="_blank" rel="noreferrer">Preview daily email</a>
              <a className="btn ghost sm" href="/api/cron/weekly?preview=1" target="_blank" rel="noreferrer">Preview weekly email</a>
            </span>
          </div>
          <div className="grid g-stat">
            <div className="tile"><div className="k">Closed amount</div><div className="v num">{formatINR(t.closed)}</div><div className="d">{t.count} closure{t.count === 1 ? "" : "s"} across the team</div></div>
            <div className="tile"><div className="k">Agency fee</div><div className="v num">{formatINR(t.fee)}</div><div className="d">Fee earned</div></div>
            <div className="tile"><div className="k">Direct expense</div><div className="v num">{formatINR(t.direct)}</div><div className="d">Paid to vendors</div></div>
            <div className="tile accent"><div className="k">Gross margin</div><div className="v num">{formatINR(t.gross)}</div><div className="d">Net {formatINR(t.net)} + fee {formatINR(t.fee)}</div></div>
          </div>

          <div className="sec-h"><h2>By person · MTD</h2></div>
          <div className="tblwrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th><th className="r">Closed</th><th className="r">Agency fee</th><th className="r">Direct</th>
                  <th className="r">Net margin</th><th className="r">Gross margin</th><th className="r">Fill</th><th className="r">Streak</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => {
                  const mt = month.by.get(m.id) ?? emptyTotals();
                  const s = habitStats(filledMap.get(m.id), now, m.joinedKey);
                  const good = s.fillDen === 0 || s.fillNum / s.fillDen >= 0.85;
                  return (
                    <tr key={m.id}>
                      <td>{m.name}{m.role === "MANAGER" && <span className="subtle">Manager</span>}</td>
                      <td className="r money">{groupINR(mt.closed)}</td>
                      <td className="r money">{groupINR(mt.fee)}</td>
                      <td className="r money">{groupINR(mt.direct)}</td>
                      <td className="r money">{groupINR(mt.net)}</td>
                      <td className="r money">{groupINR(mt.gross)}</td>
                      <td className={`r ${good ? "pos" : "neg"}`}>{s.fillNum}/{s.fillDen}</td>
                      <td className="r">{s.streak}</td>
                    </tr>
                  );
                })}
                <tr className="total">
                  <td>Team</td>
                  <td className="r money">{groupINR(t.closed)}</td>
                  <td className="r money">{groupINR(t.fee)}</td>
                  <td className="r money">{groupINR(t.direct)}</td>
                  <td className="r money">{groupINR(t.net)}</td>
                  <td className="r money">{groupINR(t.gross)}</td>
                  <td className="r">—</td>
                  <td className="r">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="sec-h"><h2>Today&apos;s closures</h2><span className="hint">{isLocked(now) ? "sealed at 11:30 PM" : "live until 11:30 PM"}</span></div>
          <ClosureTable rows={todayRows} empty="No closures logged yet today." />

          <div className="sec-h"><h2>Yesterday&apos;s closures</h2><span className="hint">{fmtLong(dayStart(yesterday))} · sealed</span></div>
          <ClosureTable rows={yesterdayRows} empty="No closures were logged yesterday." />

          <div className="grid g-split" style={{ marginTop: 8 }}>
            <div>
              <div className="sec-h"><h2>Filled today</h2><span className="hint">closure or 000 logged</span></div>
              <div className="fillgrid">
                {team.map((m) => {
                  const done = filledMap.get(m.id)?.has(today);
                  return (
                    <div key={m.id} className={`fillcard ${done ? "yes" : "no"}`}>
                      <span className="mk">{done ? "✓" : "!"}</span>
                      <div>
                        <div className="nm">{m.name.split(" ")[0]}</div>
                        <div className="ss">{done ? "Ledger filled" : "Not filled yet"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="sec-h"><h2>Pipeline · by stage</h2><span className="hint">{projects.length} on the board</span></div>
              <div className="tile" style={{ padding: 16 }}>
                <div className="stagebars">
                  {counts.map((c) => (
                    <div className="sbar" key={c.stage}>
                      <span className="lab">{c.stage}</span>
                      <span className="track">
                        <span className="fill" style={{ width: `${(c.count / maxCount) * 100}%`, background: STAGE_COLOR[c.stage] }} />
                      </span>
                      <span className="ct">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="sec-h"><h2>Needs your attention</h2>{attentionCount > 0 && <span className="hint">{attentionCount} item{attentionCount === 1 ? "" : "s"}</span>}</div>
          <div className="tile" style={{ padding: "4px 16px" }}>
            {attentionCount === 0 && <div className="flagrow"><span className="tagx ok">Clear</span><div className="txt muted">Nothing needs you right now.</div></div>}
            {backfills.map((b) => (
              <div key={b.id} className="flagrow">
                <span className="tagx back">Backfill</span>
                <div className="txt"><b>{b.requester.name}</b> wants to add to <b>{fmtShort(b.date)}</b> · <span className="muted">{b.reason}</span></div>
                <BackfillDecision id={b.id} />
              </div>
            ))}
            {stale.map((p) => (
              <div key={p.id} className="flagrow">
                <span className="tagx stale">Stale</span>
                <div className="txt"><b>{p.name}</b> · {p.owner.name} · active, untouched {p.staleDays} working days</div>
                <div className="mini"><OpenProjectButton id={p.id} /></div>
              </div>
            ))}
            {overdue.map((p) => (
              <div key={p.id} className="flagrow">
                <span className="tagx stale">Overdue</span>
                <div className="txt"><b>{p.name}</b> · {p.owner.name} · deadline was {fmtShort(p.deadline!)}, now {p.stage.toLowerCase()}</div>
                <div className="mini"><OpenProjectButton id={p.id} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
