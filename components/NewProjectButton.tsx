"use client";

import { useShell } from "@/components/AppShell";

export default function NewProjectButton({ mode }: { mode: "self" | "assign" }) {
  const { newProject, isManager, me } = useShell();
  // Managers assign to anyone; Brand Solutions people assign to AI members.
  if (mode === "assign" && !(isManager || me.money)) return null;
  return (
    <button className="btn pri" onClick={() => newProject(mode)}>
      {mode === "assign" ? "+ Assign project" : "+ Add project"}
    </button>
  );
}
