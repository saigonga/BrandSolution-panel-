import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { getTeam, visibleProjects } from "@/lib/report";
import { habitStats, habitWindowStart, loadFilledMap } from "@/lib/stats";
import { isOpenStage, sortProjects } from "@/lib/constants";
import Topbar from "@/components/Topbar";
import ProjectCard from "@/components/ProjectCard";
import NewProjectButton from "@/components/NewProjectButton";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const me = await getUser();
  if (!me) redirect("/signin");

  const now = new Date();
  const [team, projects, filledMap] = await Promise.all([
    getTeam(),
    visibleProjects(now),
    loadFilledMap(habitWindowStart(now)),
  ]);

  return (
    <>
      <Topbar title="Team Board" sub="Everyone's live projects · click any card for its full history" />
      <section className="view">
        <div className="pad">
          <div className="sec-h first">
            <h2>Who&apos;s on what</h2>
            <span className="hint">{projects.filter((p) => isOpenStage(p.stage)).length} open projects across the team</span>
            <span className="act"><NewProjectButton mode="assign" /></span>
          </div>
          <div className="callout">
            <span className="ic" style={{ color: "var(--info)" }}>●</span>
            <div>Everyone sees everyone&apos;s work, the manager&apos;s included. Projects and stages are open to the whole team; closure numbers stay private to each person and the manager.</div>
          </div>

          {team.map((m, i) => {
            const mine = sortProjects(projects.filter((p) => p.owner.id === m.id));
            const open = mine.filter((p) => isOpenStage(p.stage)).length;
            const stale = mine.filter((p) => p.isStale).length;
            const s = habitStats(filledMap.get(m.id), now, m.joinedKey);
            const fillGood = s.fillDen === 0 || s.fillNum / s.fillDen >= 0.85;
            return (
              <div className="person" key={m.id} style={i === 0 ? { marginTop: 18 } : undefined}>
                <div className="phead">
                  <Avatar name={m.name} image={m.image} className={m.role === "MANAGER" ? "pav" : "pav alt"} />
                  <div>
                    <div className="nm">
                      {m.name}
                      {m.role === "MANAGER" && <span className="ismanager">Manager</span>}
                      {m.id === me.id && <span className="badge" style={{ padding: "1px 7px", fontSize: 10 }}>You</span>}
                    </div>
                    <div className="rl">{m.title}</div>
                  </div>
                  <div className="st">
                    <span className="badge">{open} open</span>
                    {stale > 0 && <span className="badge low">{stale} stale</span>}
                    <span className={`badge ${fillGood ? "ok" : "low"}`}>{s.fillNum}/{s.fillDen} filled</span>
                    <span className="badge">Streak {s.streak}</span>
                    {s.filledToday ? <span className="badge ok">Filled today</span> : <span className="badge">Not filled today</span>}
                  </div>
                </div>
                {mine.length ? (
                  <div className="grid g-col4">
                    {mine.map((p) => <ProjectCard key={p.id} p={p} compact />)}
                  </div>
                ) : (
                  <div className="empty" style={{ padding: "16px" }}>No projects on the board yet.</div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
