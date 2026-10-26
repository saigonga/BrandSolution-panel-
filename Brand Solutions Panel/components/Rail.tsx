"use client";

import { signOut } from "next-auth/react";
import { useShell, type ViewKey } from "@/components/AppShell";
import Avatar from "@/components/Avatar";

interface NavItem { key: ViewKey; label: string; sub: string; managerOnly?: boolean }

const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Daily input", items: [{ key: "workspace", label: "My workspace", sub: "projects & ledger" }] },
  {
    title: "Dashboards",
    items: [
      { key: "team", label: "Team board", sub: "everyone's work" },
      { key: "dashboard", label: "Manager dashboard", sub: "money & accountability", managerOnly: true },
    ],
  },
  { title: "Reference", items: [{ key: "clients", label: "Client directory", sub: "brands & categories" }] },
];

export default function Rail() {
  const { me, isManager, view, setView } = useShell();

  return (
    <nav className="rail" aria-label="Main">
      <div className="brand">
        <span className="mk" />
        <div>
          <b>TBM</b>
          <span>Brand Solutions</span>
        </div>
      </div>

      {GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.managerOnly || isManager);
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
