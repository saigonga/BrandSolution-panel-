"use client";

import { useShell } from "@/components/AppShell";

export default function NewProjectButton({ mode }: { mode: "self" | "assign" }) {
  const { newProject, isManager } = useShell();
  if (mode === "assign" && !isManager) return null;
  return (
    <button className="btn pri" onClick={() => newProject(mode)}>
      {mode === "assign" ? "+ Assign project" : "+ Add project"}
    </button>
  );
}
