"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useShell, type ViewKey } from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { TEAM_COOKIE } from "@/lib/team-cookie";

interface NavItem { key: ViewKey; label: string; sub: string; managerOnly?: boolean; moneyOnly?: boolean }

const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Daily input", items: [{ key: "workspace", label: "My workspace", sub: "projects & ledger" }] },
  {
    title: "Dashboards",
    items: [
      { key: "team", label: "Team board", sub: "everyone's work" },
      { key: "dashboard", label: "Manager dashboard", sub: "money & accountability", managerOnly: true, moneyOnly: true },
    ],
  },
  { title: "Reference", items: [{ key: "clients", label: "Client directory", sub: "brands & categories", moneyOnly: true }] },
];

export default function Rail() {
  const { me, isManager, view, setView, activeTeam, teams } = useShell();
  const router = useRouter();

  function switchTeam(id: string) {
    document.cookie = `${TEAM_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    setView("workspace");
    router.refresh();
  }

  return (
    <nav className="rail" aria-label="Main">
      <div className="brand">
        <span className="mk" />
        <div>
          <b>TBM</b>
          <span>{activeTeam.label}</span>
        </div>
      </div>

      {teams.length > 1 && (
        <div style={{ padding: "0 14px 10px" }}>
          <select
            aria-label="Switch team"
            value={activeTeam.id}
            onChange={(e) => switchTeam(e.target.value)}
            style={{ width: "100%" }}
          >
            {teams.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      )}

      {GROUPS.map((g) => {
        const items = g.items.filter((i) => (!i.managerOnly || isManager) && (!i.moneyOnly || activeTeam.money));
        if (!items.length) return null;
        return (
          <div key={g.title} style={{ display: "contents" }}>
            <div className="grp">{g.title}</div>
            {items.map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => setView(i.key)}
                className={`navbtn${view === i.key ? " on" : ""}`}
              >
                <span className="dot" />
                <span>
                  {i.label}
                  <small>{i.sub}</small>
                </span>
              </button>
            ))}
          </div>
        );
      })}

      <div className="railuser">
        <Avatar name={me.name} image={me.image} className="av" style={{ width: 28, height: 28, fontSize: 11 }} />
        <div className="who2">
          <div className="nm">{me.name}</div>
          <div className="rl">{isManager ? "Manager" : "Team member"}</div>
        </div>
        <button className="signout" onClick={() => signOut({ callbackUrl: "/signin" })}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
