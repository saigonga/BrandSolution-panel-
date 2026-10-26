import { addDays, dayKey, dayStart, fmtLong, fmtShort, isWorkingDay, monthStartKey } from "@/lib/time";
import { computeMargins, formatINR } from "@/lib/money";
import {
  closuresBetween, closuresOn, filledBetween, getTeam, movementsBetween, pendingBackfills,
  stageCounts, totalsByOwner, visibleProjects, workingKeys,
} from "@/lib/report";
import { emptyTotals, type MoneyTotals } from "@/lib/stats";

// ---------- tiny email HTML kit (inline styles, table layout) ----------

const C = {
  bg: "#0a0a0c", card: "#131316", line: "#26262c", ink: "#f4f4f6", ink2: "#9a9aa4",
  gold: "#e8b457", good: "#4bbf87", crit: "#e86a5e",
};

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function table(head: string[], rows: string[][], right: number[] = [], totalRow?: string[]): string {
  const th = head
    .map((h, i) => `<th align="${right.includes(i) ? "right" : "left"}" style="padding:8px 10px;font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:${C.ink2};border-bottom:1px solid ${C.line};font-weight:700">${esc(h)}</th>`)
    .join("");
  const tr = (r: string[], bold = false) =>
    `<tr>${r.map((c, i) => `<td align="${right.includes(i) ? "right" : "left"}" style="padding:8px 10px;font-size:13px;color:${C.ink};border-bottom:1px solid ${C.line};${bold ? "font-weight:700;" : ""}">${c}</td>`).join("")}</tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${C.card};border:1px solid ${C.line};border-radius:10px">
    <tr>${th}</tr>${rows.map((r) => tr(r)).join("")}${totalRow ? tr(totalRow, true) : ""}</table>`;
}

function section(title: string, body: string): string {
  return `<tr><td style="padding:22px 0 8px;font-size:13px;font-weight:700;color:${C.gold};letter-spacing:.3px">${esc(title)}</td></tr><tr><td>${body}</td></tr>`;
}

function para(text: string, color = C.ink2): string {
  return `<div style="font-size:13px;color:${color};line-height:1.6">${text}</div>`;
}

function shell(title: string, sub: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:${C.bg};font-family:Inter,Segoe UI,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}"><tr><td align="center" style="padding:28px 14px">
  <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">
    <tr><td style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.gold};font-weight:700">TBM · Brand Solutions</td></tr>
    <tr><td style="font-size:22px;font-weight:800;color:${C.ink};padding-top:4px">${esc(title)}</td></tr>
    <tr><td style="font-size:13px;color:${C.ink2};padding-top:2px">${esc(sub)}</td></tr>
    ${body}
    <tr><td style="padding-top:26px;font-size:11px;color:${C.ink2}">Amounts are pre-tax. Net margin = closed − direct expense. Gross margin = net + agency fee.</td></tr>
  </table></td></tr></table></body></html>`;
}

function money(n: number) {
  return esc(formatINR(n));
}

function totalsRow(label: string, t: MoneyTotals): string[] {
  return [esc(label), money(t.closed), money(t.fee), money(t.direct), money(t.net), money(t.gross)];
}

// ---------- daily digest: the previous day, sealed at 11:30 PM ----------

export async function buildDaily(now: Date = new Date()) {
  const today = dayKey(now);
  const day = addDays(today, -1);
  const dayDate = dayStart(day);

  const [team, closures, month, moves, filled, projects, backfills] = await Promise.all([
    getTeam(),
    closuresOn(day),
    totalsByOwner(monthStartKey(dayDate), today),
    movementsBetween(day, today),
    filledBetween(day, today),
    visibleProjects(now),
    pendingBackfills(),
  ]);

  let body = "";

  // 1. closures
  const dayTotal = emptyTotals();
  const cRows = closures.map((c) => {
    const { net, gross } = computeMargins(c.closedAmount, c.agencyFee, c.directExpense);
    dayTotal.closed += c.closedAmount; dayTotal.fee += c.agencyFee; dayTotal.direct += c.directExpense;
    dayTotal.net += net; dayTotal.gross += gross;
    return [
      esc(c.owner.name.split(" ")[0]),
      esc(c.client?.brand ?? "—") + (c.productCategory ? `<div style="color:${C.ink2};font-size:11px">${esc(c.productCategory)}</div>` : ""),
      esc(c.description ?? ""),
      money(c.closedAmount), money(c.agencyFee), money(net), money(gross),
    ];
  });
  body += section(
    "Closures",
    closures.length
      ? table(["Person", "Client", "What closed", "Closed", "Fee", "Net", "Gross"], cRows, [3, 4, 5, 6],
          ["Day total", "", "", money(dayTotal.closed), money(dayTotal.fee), money(dayTotal.net), money(dayTotal.gross)])
      : para("No closures were logged.")
  );

  // 2. month to date
  const mRows = team.map((m) => totalsRow(m.name, month.by.get(m.id) ?? emptyTotals()));
  body += section(
    "Month to date",
    table(["Person", "Closed", "Fee", "Direct", "Net", "Gross"], mRows, [1, 2, 3, 4, 5], totalsRow("Team", month.team))
  );

  // 3. project movements
  const moveLines = moves.map((u) =>
    u.type === "CREATE"
      ? `<b style="color:${C.ink}">${esc(u.project.name)}</b> · new, ${esc(u.project.owner.name)} (${esc(u.toStage ?? "")})`
      : `<b style="color:${C.ink}">${esc(u.project.name)}</b> · ${esc(u.fromStage ?? "")} → ${esc(u.toStage ?? "")} by ${esc(u.author.name)}`
  );
  body += section("Project movements", para(moveLines.length ? moveLines.join("<br>") : "No stage changes or new projects."));

  // 4. who filled
  const fillLines = isWorkingDay(day)
    ? team.filter((m) => m.joinedKey <= day).map((m) => {
        const ok = filled.get(m.id)?.has(day);
        return `<span style="color:${ok ? C.good : C.crit};font-weight:700">${ok ? "✓" : "✗"}</span> ${esc(m.name)}${ok ? "" : ` <span style="color:${C.crit}">missed</span>`}`;
      })
    : [`${esc(fmtShort(dayDate))} was not a working day.`];
  body += section("Who filled", para(fillLines.join("<br>"), C.ink));

  // 5. flags
  const stale = projects.filter((p) => p.isStale);
  const overdue = projects.filter((p) => p.isOverdue);
  const flags = [
    ...stale.map((p) => `<span style="color:${C.crit};font-weight:700">Stale</span> ${esc(p.name)} · ${esc(p.owner.name)} · untouched ${p.staleDays} working days`),
    ...overdue.map((p) => `<span style="color:${C.crit};font-weight:700">Overdue</span> ${esc(p.name)} · ${esc(p.owner.name)} · due ${esc(fmtShort(p.deadline!))}`),
    ...backfills.map((b) => `<span style="color:${C.gold};font-weight:700">Backfill</span> ${esc(b.requester.name)} wants to add to ${esc(fmtShort(b.date))} · ${esc(b.reason)}`),
  ];
  body += section("Needs your attention", para(flags.length ? flags.join("<br>") : "Nothing flagged.", C.ink));

  return {
    subject: `Brand Solutions daily · ${fmtLong(dayDate)}`,
    html: shell("Daily summary", fmtLong(dayDate), body),
  };
}

// ---------- weekly digest: the seven days ending yesterday ----------

export async function buildWeekly(now: Date = new Date()) {
  const today = dayKey(now);
  const from = addDays(today, -7);
  const prevFrom = addDays(today, -14);

  const [team, week, prev, closures, projects, moves, filled] = await Promise.all([
    getTeam(),
    totalsByOwner(from, today),
    totalsByOwner(prevFrom, from),
    closuresBetween(from, today),
    visibleProjects(now),
    movementsBetween(from, today),
    filledBetween(from, today),
  ]);

  let body = "";

  // 1. money
  const delta = week.team.gross - prev.team.gross;
  const deltaTxt =
    prev.team.gross === 0
      ? "No closures the week before to compare against."
      : `Gross margin ${delta >= 0 ? "up" : "down"} ${formatINR(Math.abs(delta))} on the previous week.`;
  body += section(
    "Week in money",
    table(["Person", "Closed", "Fee", "Direct", "Net", "Gross"],
      team.map((m) => totalsRow(m.name, week.by.get(m.id) ?? emptyTotals())), [1, 2, 3, 4, 5],
      totalsRow("Team", week.team)) + `<div style="height:8px"></div>` + para(esc(deltaTxt))
  );

  // 2. closures list
  body += section(
    "Closures this week",
    closures.length
      ? table(["Date", "Person", "Client", "What closed", "Gross"],
          closures.map((c) => {
            const { gross } = computeMargins(c.closedAmount, c.agencyFee, c.directExpense);
            return [esc(fmtShort(c.date)), esc(c.owner.name.split(" ")[0]), esc(c.client?.brand ?? "—"), esc(c.description ?? ""), money(gross)];
          }), [4])
      : para("No closures this week.")
  );

  // 3. pipeline
  const counts = stageCounts(projects).filter((s) => s.count > 0);
  const byPerson = team.map((m) => {
    const mine = projects.filter((p) => p.owner.id === m.id && !["Closed", "Dropped"].includes(p.stage));
    return [esc(m.name), String(mine.length), String(mine.filter((p) => p.stage === "Awaiting client").length), String(mine.filter((p) => p.isStale).length)];
  });
  body += section(
    "Pipeline snapshot",
    para(counts.length ? counts.map((s) => `${esc(s.stage)} <b style="color:${C.ink}">${s.count}</b>`).join(" &nbsp;·&nbsp; ") : "No projects yet.", C.ink2) +
      `<div style="height:10px"></div>` +
      table(["Person", "Open", "Awaiting client", "Stale"], byPerson, [1, 2, 3])
  );

  // 4. movement
  const ended = moves.filter((u) => u.type === "STAGE" && ["Closed", "Parked", "Dropped"].includes(u.toStage ?? ""));
  const created = moves.filter((u) => u.type === "CREATE").length;
  const stageMoves = moves.filter((u) => u.type === "STAGE").length;
  body += section(
    "What moved",
    para(`${created} new project${created === 1 ? "" : "s"} · ${stageMoves} stage change${stageMoves === 1 ? "" : "s"}`, C.ink) +
      (ended.length
        ? `<div style="height:6px"></div>` + para(ended.map((u) => `<b style="color:${C.ink}">${esc(u.project.name)}</b> → ${esc(u.toStage ?? "")} (${esc(u.project.owner.name)})`).join("<br>"))
        : "")
  );

  // 5. fill rate
  const wk = workingKeys(from, today);
  body += section(
    "Daily fill",
    table(["Person", "Filled"],
      team.map((m) => {
        const days = wk.filter((k) => k >= m.joinedKey);
        const n = days.filter((k) => filled.get(m.id)?.has(k)).length;
        const color = n === days.length ? C.good : C.crit;
        return [esc(m.name), `<span style="color:${color};font-weight:700">${n}/${days.length}</span>`];
      }), [1])
  );

  // 6. stale
  const stale = projects.filter((p) => p.isStale);
  body += section(
    "Stale projects",
    para(stale.length ? stale.map((p) => `${esc(p.name)} · ${esc(p.owner.name)} · ${p.staleDays} working days untouched`).join("<br>") : "None. Every active project moved this week.", C.ink)
  );

  const range = `${fmtShort(dayStart(from))} – ${fmtShort(dayStart(addDays(today, -1)))}`;
  return {
    subject: `Brand Solutions weekly · ${range}`,
    html: shell("Weekly summary", range, body),
  };
}
