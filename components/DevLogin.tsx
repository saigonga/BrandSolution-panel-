"use client";

import { signIn } from "next-auth/react";

// Shown only when DEV_LOGIN=true on a local dev server.
export default function DevLogin({ members }: { members: { email: string; name: string; role: string }[] }) {
  return (
    <div className="callout warn" style={{ flexDirection: "column", gap: 10 }}>
      <div><b>Test login</b> · local only. Pick who to sign in as.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {members.map((m) => (
          <button
            key={m.email}
            className="btn sm"
            onClick={() => signIn("dev-login", { email: m.email, callbackUrl: "/" })}
          >
            {m.name.split(" ")[0]}{m.role === "MANAGER" ? " (manager)" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
