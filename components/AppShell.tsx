"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ClientDTO, MemberDTO } from "@/lib/dto";
import Rail from "@/components/Rail";
import ProjectModal from "@/components/ProjectModal";
import ProjectDrawer from "@/components/ProjectDrawer";

export type ViewKey = "workspace" | "team" | "dashboard" | "clients";

export interface Me extends MemberDTO {
  email: string;
}

interface ShellCtx {
  me: Me;
  clients: ClientDTO[];
  team: MemberDTO[];
  isManager: boolean;
  view: ViewKey;
  setView: (v: ViewKey) => void;
  openProject: (id: string) => void;
  newProject: (mode: "self" | "assign") => void;
}

const Ctx = createContext<ShellCtx | null>(null);

export function useShell(): ShellCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShell must be used inside AppShell");
  return v;
}

export default function AppShell({
  me, clients, team, views, children,
}: {
  me: Me;
  clients: ClientDTO[];
  team: MemberDTO[];
  views?: Partial<Record<ViewKey, React.ReactNode>>;
  children?: React.ReactNode;
}) {
  const [view, setViewState] = useState<ViewKey>("workspace");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [modal, setModal] = useState<"self" | "assign" | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const setView = useCallback((v: ViewKey) => {
    setViewState(v);
    mainRef.current?.scrollTo({ top: 0 });
  }, []);
  const openProject = useCallback((id: string) => setDrawerId(id), []);
  const newProject = useCallback((mode: "self" | "assign") => setModal(mode), []);

  const value = useMemo<ShellCtx>(
    () => ({ me, clients, team, isManager: me.role === "MANAGER", view, setView, openProject, newProject }),
    [me, clients, team, view, setView, openProject, newProject]
  );

  return (
    <Ctx.Provider value={value}>
      <div className="app">
        <Rail />
        <main ref={mainRef} className="main">{views ? views[view] : children}</main>
      </div>
      {modal && <ProjectModal mode={modal} onClose={() => setModal(null)} />}
      {drawerId && <ProjectDrawer id={drawerId} onClose={() => setDrawerId(null)} />}
    </Ctx.Provider>
  );
}
