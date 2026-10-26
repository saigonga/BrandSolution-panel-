import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import {
  addToTotals, closureInclude, emptyTotals, habitStats, habitWindowStart, loadFilledMap, projectInclude,
  toBackfillDTO, toClosureDTO, toProjectDTO, visibleProjectsWhere, writableDays,
} from "@/lib/stats";
import { addDays, dayKey, dayStart, fmtMonth, monthStartKey } from "@/lib/time";
import { formatINR } from "@/lib/money";
import { isOpenStage, sortProjects } from "@/lib/constants";
import Topbar from "@/components/Topbar";
import ProjectCard from "@/components/ProjectCard";
import NewProjectButton from "@/components/NewProjectButton";
import Ledger from "@/components/Ledger";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const me = await getUser();
  if (!me) redirect("/signin");

  const now = new Date();
  const today = dayKey(now);
  const monthStart = monthStartKey(now);

  const [projectRows, filledMap, writable, backfillRows] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: me.id, ...visibleProjectsWhere(now) },
      include: projectInclude,
    }),
    loadFilledMap(habitWindowStart(now)),
    writableDays(me.id, now),
    prisma.backfillRequest.findMany({
      where: { requesterId: me.id, createdAt: { gte: dayStart(addDays(today, -30)) } },
      include: { requester: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  // Ledger: this month, plus any earlier day reopened by an approved backfill.
  const extraDays = Array.from(writable).filter((k) => k < monthStart);
  const closureRows = await prisma.closure.findMany({
    where: {
      ownerId: me.id,
      OR: [
        { date: { gte: dayStart(monthStart) } },
        ...extraDays.map((k) => ({ date: { gte: dayStart(k), lt: dayStart(addDays(k, 1)) } })),
      ],
    },
    include: closureInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const projects = sortProjects(projectRows.map((p) => toProjectDTO(p, now)));
  const entries = closureRows.map((c) => toClosureDTO(c, writable, me.id));
  const totals = emptyTotals();
  for (const c of closureRows) if (dayKey(c.date) >= monthStart) addToTotals(totals, c);
  const stats = habitStats(filledMap.get(me.id), now, me.joinedKey);
  const backfills = backfillRows.map((b) => toBackfillDTO(b, now));
  const openCount = projects.filter((p) => isOpenStage(p.stage)).length;
  const isManager = me.role === "MANAGER";

  return (
    <>
      <Topbar title="My Workspace" sub={`${me.name} · ${me.title}`} />
      <section className="view">
        <div className="pad">
          {isManager && (
            <div className="callout" style={{ marginBottom: 22 }}>
              <span className="ic" style={{ color: "var(--brand)" }}>●</span>
              <div>You fill this too. Your projects and closures show on the team board and count in the dashboard totals, same as everyone else&apos;s.</div>
            </div>
          )}

          <div className="sec-h first">
            <h2>My day</h2>
            <span className="hint">Fill before the day locks at 11:30 PM</span>
          </div>
          <div className="grid g-stat">
            <div className="tile">
              <div className="k">Streak</div>
              <div className="v num">{stats.streak} <small>{stats.streak === 1 ? "day" : "days"}</small></div>
              <div className="d">{stats.filledToday ? "Today is filled" : "Working days filled in a row"}</div>
            </div>
            <div className="tile">
              <div className="k">Fill rate</div>
              <div className="v num">{stats.fillNum}<small>/{stats.fillDen}</small></div>
              <div className="d">Working days this month</div>
            </div>
            <div className="tile">
              <div className="k">My agency fee · MTD</div>
              <div className="v num">{formatINR(totals.fee)}</div>
              <div className="d">{totals.count} closure{totals.count === 1 ? "" : "s"} this month</div>
            </div>
            <div className="tile">
              <div className="k">My gross margin · MTD</div>
              <div className="v num">{formatINR(totals.gross)}</div>
              <div className="d">Net {formatINR(totals.net)} + fee</div>
            </div>
          </div>

          <div className="sec-h">
            <h2>My projects</h2>
            <span className="hint">{openCount} open</span>
            <span className="act"><NewProjectButton mode="self" /></span>
          </div>
          {projects.length ? (
            <div className="grid g-proj">
              {projects.map((p) => <ProjectCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="empty">
              <b>No projects yet</b>
              <span>Add every client project, pitch and internal piece you&apos;re working on. One card each.</span>
              <NewProjectButton mode="self" />
            </div>
          )}

          <Ledger
            entries={entries}
            totals={totals}
            monthLabel={fmtMonth(now).split(" ")[0]}
            todayKey={today}
            todayWritable={writable.has(today)}
            backfills={backfills}
          />
        </div>
      </section>
    </>
  );
}
